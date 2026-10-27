import { IsoDateString } from '../../core/api/models';
import { daysBetween } from './dates';
import { formatCalendar } from './format';

export type DueTone = 'danger' | 'warning' | 'none';

export interface DueInfo {
  text: string;
  tone: DueTone;
  overdue: boolean;
}

/** "3 days overdue", "Today", "Tomorrow", "Thursday", "12 Nov" relative to `today` (YYYY-MM-DD). */
export function dueInfo(date: IsoDateString | null, today: string): DueInfo | null {
  if (!date) return null;
  const diff = daysBetween(today, date.slice(0, 10));
  if (diff < 0) {
    return {
      text: diff === -1 ? 'Yesterday' : `${-diff} days overdue`,
      tone: 'danger',
      overdue: true,
    };
  }
  if (diff === 0) return { text: 'Today', tone: 'warning', overdue: false };
  if (diff === 1) return { text: 'Tomorrow', tone: 'none', overdue: false };
  if (diff < 7) return { text: formatCalendar(date, 'EEEE'), tone: 'none', overdue: false };
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return {
    text: formatCalendar(date, sameYear ? 'd MMM' : 'd MMM y'),
    tone: 'none',
    overdue: false,
  };
}
