// exclusive-bem-block: habit-module-info-cards
import type { HabitWidgetInsight } from '@habsum/types/common/habit';
import { Hoverable } from '@habsum/ui/components/Hoverable';

type InfoCardsProps = {
  cards: HabitWidgetInsight[] | undefined;
};

function InfoCardContent({ header, description }: HabitWidgetInsight) {
  return (
    <>
      <span className="habit-module-info-cards__header text-light text-b-s">{header}</span>
      <span className="habit-module-info-cards__description text-b-s">{description}</span>
    </>
  );
}

export function InfoCards({ cards }: InfoCardsProps) {
  if (cards == null || cards.length === 0) return null;

  return (
    <div className="habit-module-info-cards">
      {cards.map((card) =>
        card.hover ? (
          <Hoverable.Root key={`${card.header}-${card.description}-${card.hover}`}>
            <Hoverable.Anchor className="habit-module-info-cards__card text--hoverable-target">
              <InfoCardContent {...card} />
            </Hoverable.Anchor>
            <Hoverable.Content className="habit-module-info-cards__tooltip" side="top">
              <span className="text-b-m">{card.hover}</span>
            </Hoverable.Content>
          </Hoverable.Root>
        ) : (
          <div key={`${card.header}-${card.description}`} className="habit-module-info-cards__card">
            <InfoCardContent {...card} />
          </div>
        ),
      )}
    </div>
  );
}
