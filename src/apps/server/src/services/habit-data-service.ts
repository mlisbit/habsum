// Read boundary for hydrated habit data. Caching can be added here without changing consumers.
import { HabitRepository } from '../repositories/habit-repository.js';
import type { HabitDataQuery, HabitDataSnapshot } from '../types/habit.types.js';

export class HabitDataService {
  constructor(private readonly repository = new HabitRepository()) {}

  loadSnapshot(query: HabitDataQuery): HabitDataSnapshot {
    return this.repository.loadSnapshot(query);
  }
}
