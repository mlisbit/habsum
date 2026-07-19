// Service function for exporting a user's stored habit events as CSV text.
import { HabitRepository } from '../repositories/habit-repository.js';

const habitRepository = new HabitRepository();

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function csvLine(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(',');
}

export function buildUserDataCsv(user: string): string {
  const lines = [
    csvLine(['record_type', 'habit', 'date', 'value', 'event_id', 'amount', 'created_at']),
  ];
  const data = habitRepository.getDataExport(user);

  for (const row of data.dailySelects) {
    lines.push(csvLine(['daily_select', row.habit, row.date, row.value, '', '', row.updatedAt]));
  }

  for (const row of data.summationEvents) {
    lines.push(
      csvLine(['summation_event', row.habit, row.date, '', row.id, row.amount, row.createdAt]),
    );
  }

  return `${lines.join('\n')}\n`;
}
