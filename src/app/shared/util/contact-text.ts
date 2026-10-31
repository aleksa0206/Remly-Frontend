import { Contact, IsoDateString, MeetingType, Relationship } from '../../core/api/models';
import { IconName } from '../ui/icon';
import { daysBetween } from './dates';
import { formatCalendar } from './format';

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  Family: 'Family',
  Friend: 'Friend',
  Partner: 'Partner',
  Colleague: 'Colleague',
  Acquaintance: 'Acquaintance',
  Other: 'Other',
};

export const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string; icon: IconName }[] = [
  { value: 'InPerson', label: 'In person', icon: 'users' },
  { value: 'Call', label: 'Call', icon: 'phone' },
  { value: 'VideoCall', label: 'Video call', icon: 'video' },
  { value: 'Message', label: 'Message', icon: 'message' },
];

export function meetingTypeOption(type: MeetingType) {
  return MEETING_TYPE_OPTIONS.find((option) => option.value === type)!;
}

export const CATCH_UP_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 7, label: 'Every week' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 30, label: 'Every month' },
  { value: 90, label: 'Every 3 months' },
  { value: 180, label: 'Every 6 months' },
  { value: 365, label: 'Every year' },
];

export function catchUpLabel(days: number | null): string {
  return CATCH_UP_OPTIONS.find((o) => o.value === days)?.label ?? `Every ${days} days`;
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "4 months ago", "2 years ago". */
export function agoText(date: IsoDateString, today: string): string {
  const days = daysBetween(date.slice(0, 10), today);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? 'a year ago' : `${years} years ago`;
}

/** "12 March" or "12 March 1990". */
export function birthdayText(contact: Contact): string | null {
  const { birthdayDay: day, birthdayMonth: month, birthdayYear: year } = contact;
  if (!day || !month) return null;
  const date = `${year ?? 2000}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return formatCalendar(date, year ? 'd MMMM y' : 'd MMMM');
}

/** Name as the user would say it: the nickname when there is one. */
export function displayName(contact: { firstName: string; nickname: string | null }): string {
  return contact.nickname || contact.firstName;
}
