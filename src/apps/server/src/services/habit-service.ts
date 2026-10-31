// Domain operations for reading habit data and applying habit mutations.
import { Logger } from '@habsum/tracking/server/logger';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import { HabitResultBuilder } from '../builders/habit-result-builder.js';
import {
  HistoryPagePresenter,
  type HistoryPagePresenterInput,
} from '../presenters/history-page-presenter.js';
import {
  HabitPresenter,
  type HabitPresentationContext,
} from '../presenters/habits/habit-presenter.js';
import { SingleSelectHabitPresenter } from '../presenters/habits/single-select-habit-presenter.js';
import { SummationHabitPresenter } from '../presenters/habits/summation-habit-presenter.js';
import { TextHabitPresenter } from '../presenters/habits/text-habit-presenter.js';
import { getHabitApiToday } from '../utils/server-time-utils.js';
import type { UserHabitRepository } from '../repositories/user-habit-repository.js';
import type {
  HabitDataMetadata,
  HabitListViewContext,
  HydratedHabitData,
  PatchBody,
} from '../types/habit.types.js';
import type { HabitDef } from '../types/userConfig.js';
import ServiceError from '../utils/classes/service-error.js';
import isHabitRepeatedOnDate from '../utils/habits/is-habit-repeated-on-date.js';
import type { HabitTypeService } from './habits/habit-type-service.js';
import { SingleSelectHabitService } from './habits/single-select-habit-service.js';
import { SummationHabitService } from './habits/summation-habit-service.js';
import { TextHabitService } from './habits/text-habit-service.js';

type PatchHabitInput = {
  user: string;
  body?: PatchBody;
  at?: Date;
};

type PresentHabitListInput = {
  user: string;
  context: HabitListViewContext;
  metadata: HabitDataMetadata;
  hydratedHabits: HydratedHabitData[];
};

/**
 * Handles the habit-list read model and habit mutations.
 *
 * History-page responses for `GET /users/:user/habits/history` are assembled
 * separately by `HistoryPagePresenter`.
 */
export class HabitService {
  constructor(
    private readonly repository: UserHabitRepository,
    private readonly logger = new Logger(),
  ) {}

  /**
   * Presents the response for `GET /users/:user/habits`.
   *
   * The controller resolves the viewing context and loads the hydrated habits
   * and page metadata before calling this method.
   */
  getHabitListPresentation({ user, context, metadata, hydratedHabits }: PresentHabitListInput) {
    const config = this.repository.userConfig;
    const habits = this.presentHabits({
      definitions: config.habits,
      hydratedHabits,
      context: {
        viewingDate: context.viewDate,
        today: context.today,
        includeWidgets: true,
        includeAbsentDaysInAverage: config.includeAbsentDaysInAverage,
      },
    });

    return new HabitResultBuilder({
      user,
      viewingDate: context.viewDate,
      familiarName: metadata.familiarName,
      firstRecordedDate: metadata.firstRecordedDate,
      config,
      habits,
      today: context.today,
      clientHour: context.clientHour,
    }).build();
  }

  /** Presents the response for `GET /users/:user/habits/history`. */
  getHabitHistoryPresentation(input: Omit<HistoryPagePresenterInput, 'userConfig'>) {
    return new HistoryPagePresenter({ ...input, userConfig: this.repository.userConfig }).present();
  }

  /**
   * Handles `PATCH /users/:user/habits`.
   *
   * Validates and persists the requested habit mutation, then returns the
   * freshly hydrated habit response consumed by both list and detail views.
   */
  patchHabit({ user, body = {}, at = new Date() }: PatchHabitInput) {
    const config = this.repository.userConfig;
    const dateString = typeof body.date === 'string' ? body.date : null;
    if (dateString == null) {
      throw new ServiceError('bad_request', 'body.date is required (YYYY-MM-DD)');
    }

    let day: Day;
    try {
      day = dayFromString(dateString);
    } catch {
      throw new ServiceError('bad_request', 'body.date is required (YYYY-MM-DD)');
    }

    const { habit } = body;
    if (typeof habit !== 'string' || habit.length === 0) {
      throw new ServiceError('bad_request', 'habit is required');
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      throw new ServiceError('not_found', `habit "${habit}" not configured`);
    }

    const typeService =
      known.type === 'single_select'
        ? new SingleSelectHabitService(known, this.repository)
        : known.type === 'text'
          ? new TextHabitService(known, this.repository)
          : new SummationHabitService(known, this.repository);
    typeService.applyPatch({ date: day, body });

    const response = this.updatedHabit({
      user,
      date: day,
      habit,
      today: getHabitApiToday(body.today, at),
      typeService,
    });

    this.logger.logEvent({
      name: 'HabitAction',
      body: { habitType: known.type },
    });

    return response;
  }

  private presentHabits({
    definitions,
    hydratedHabits,
    context,
  }: {
    definitions: HabitDef[];
    hydratedHabits: HydratedHabitData[];
    context: HabitPresentationContext;
  }): Habit[] {
    const dataByHabitName = new Map(hydratedHabits.map((habitData) => [habitData.name, habitData]));
    return definitions
      .filter((definition) => isHabitRepeatedOnDate(definition, context.viewingDate))
      .map((definition) => {
        const habitData = dataByHabitName.get(definition.name);
        if (!habitData) {
          throw new Error(`missing hydrated data for configured habit "${definition.name}"`);
        }
        return this.getHabitPresenter(definition, {
          habitData,
          context,
        }).present();
      });
  }

  private updatedHabit({
    user,
    date,
    habit,
    today,
    typeService,
  }: {
    user: string;
    date: Day;
    habit: string;
    today: Day;
    typeService: HabitTypeService;
  }) {
    const config = this.repository.userConfig;
    const context = {
      viewDate: date,
      today,
    };
    const metadata = this.repository.getDataMetadata();
    const hydratedHabits = this.repository.loadHydratedHabits(
      this.repository.getHabitListDataQuery(context),
      {
        firstRecordedDate: metadata.firstRecordedDate,
      },
    );
    const habitData = hydratedHabits.find((candidate) => candidate.name === habit);
    if (!habitData) throw new Error(`failed to hydrate configured habit "${habit}"`);
    const definition = config.habits.find((candidate) => candidate.name === habit);
    if (!definition) throw new Error(`habit "${habit}" is not configured`);
    const result = this.getHabitPresenter(definition, {
      habitData,
      context: {
        viewingDate: date,
        today: context.today,
        includeWidgets: true,
        includeAbsentDaysInAverage: config.includeAbsentDaysInAverage,
      },
    }).present();

    return typeService.buildPatchResponse({
      user,
      date,
      result,
      habitData,
    });
  }

  private getHabitPresenter(
    definition: HabitDef,
    {
      habitData,
      context,
    }: {
      habitData: HydratedHabitData;
      context: HabitPresentationContext;
    },
  ): HabitPresenter {
    if (definition.type === 'single_select' && habitData.type === 'single_select') {
      return new SingleSelectHabitPresenter(definition, habitData, context);
    }
    if (definition.type === 'summation' && habitData.type === 'summation') {
      return new SummationHabitPresenter(definition, habitData, context);
    }
    if (definition.type === 'text' && habitData.type === 'text') {
      return new TextHabitPresenter(definition, habitData, context);
    }
    throw new Error(`hydrated habit type mismatch for "${definition.name}"`);
  }
}
