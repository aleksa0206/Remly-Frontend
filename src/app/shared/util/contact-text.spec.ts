import { Contact } from '../../core/api/models';
import { agoText, birthdayText, catchUpLabel } from './contact-text';

const today = '2026-11-05';

describe('agoText', () => {
  it.each([
    ['2026-11-05T00:00:00.000Z', 'today'],
    ['2026-11-04T00:00:00.000Z', 'yesterday'],
    ['2026-10-30T00:00:00.000Z', '6 days ago'],
    ['2026-10-15T00:00:00.000Z', '3 weeks ago'],
    ['2026-06-01T00:00:00.000Z', '5 months ago'],
    ['2025-10-01T00:00:00.000Z', 'a year ago'],
    ['2023-10-01T00:00:00.000Z', '3 years ago'],
  ])('%s → %s', (date, expected) => {
    expect(agoText(date, today)).toBe(expected);
  });
});

describe('birthdayText', () => {
  const contact = (day: number | null, month: number | null, year: number | null) =>
    ({ birthdayDay: day, birthdayMonth: month, birthdayYear: year }) as Contact;

  it('shows the year only when it is known, and handles Feb 29 without one', () => {
    expect(birthdayText(contact(12, 3, 1990))).toBe('12 March 1990');
    expect(birthdayText(contact(29, 2, null))).toBe('29 February');
    expect(birthdayText(contact(null, null, null))).toBeNull();
  });
});

describe('catchUpLabel', () => {
  it('names the common intervals and falls back to days', () => {
    expect(catchUpLabel(30)).toBe('Every month');
    expect(catchUpLabel(10)).toBe('Every 10 days');
  });
});
