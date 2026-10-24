// Backend API contracts (Remly-Backend, prisma/schema.prisma + repositories).
// Calendar dates arrive as ISO strings at UTC midnight.

export type IsoDateString = string;

export const RELATIONSHIPS = [
  'Family',
  'Friend',
  'Partner',
  'Colleague',
  'Acquaintance',
  'Other',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const MEETING_TYPES = ['InPerson', 'Call', 'VideoCall', 'Message'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];
export type MeetingStatus = 'Planned' | 'Done' | 'Cancelled';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string | null;
}

export interface User extends PersonRef {
  lastName: string;
  email: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CurrentUser extends User {
  twoFactorEnabled: boolean;
}

export interface ContactRef extends PersonRef {
  nickname: string | null;
}

export interface Contact extends ContactRef {
  email: string | null;
  phone: string | null;
  relationship: Relationship;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  birthdayYear: number | null;
  notes: string | null;
  /** "See them every N days"; null = no reminder. */
  catchUpEveryDays: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  lastMetOn: IsoDateString | null;
  nextPlannedOn: IsoDateString | null;
  catchUpDueOn: IsoDateString | null;
  createdAt: IsoDateString;
}

export interface Meeting {
  id: number;
  status: MeetingStatus;
  type: MeetingType;
  date: IsoDateString;
  /** Local "HH:MM", or null for "some time that day". */
  time: string | null;
  title: string | null;
  location: string | null;
  notes: string | null;
  contacts: ContactRef[];
}

export interface UpcomingBirthday {
  contact: Contact;
  date: IsoDateString;
  /** Age on that day, when the birth year is known. */
  turns: number | null;
}

export interface Dashboard {
  /** Planned meetings up to two weeks ahead, including ones whose day has passed. */
  upcoming: Meeting[];
  /** Due for a catch-up within a week and nothing planned yet. */
  catchUp: Contact[];
  birthdays: UpcomingBirthday[];
  recent: Meeting[];
  stats: { contacts: number; plannedTotal: number; metLast30Days: number };
}
