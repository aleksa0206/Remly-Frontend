import { dueInfo } from './due';

const today = '2026-10-16';

describe('dueInfo', () => {
  it('describes dates relative to today', () => {
    expect(dueInfo(null, today)).toBeNull();
    expect(dueInfo('2026-10-13T00:00:00.000Z', today)).toEqual({
      text: '3 days overdue',
      tone: 'danger',
      overdue: true,
    });
    expect(dueInfo('2026-10-15T00:00:00.000Z', today)?.text).toBe('Yesterday');
    expect(dueInfo('2026-10-16T00:00:00.000Z', today)).toMatchObject({
      text: 'Today',
      tone: 'warning',
    });
    expect(dueInfo('2026-10-17T00:00:00.000Z', today)?.text).toBe('Tomorrow');
    expect(dueInfo('2026-10-20T00:00:00.000Z', today)?.text).toBe('Tuesday');
    expect(dueInfo('2026-11-12T00:00:00.000Z', today)?.text).toBe('12 Nov');
    expect(dueInfo('2027-01-05T00:00:00.000Z', today)?.text).toBe('5 Jan 2027');
  });
});
