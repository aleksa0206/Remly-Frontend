import { Injectable, signal } from '@angular/core';

export type ChangeTopic = 'contacts' | 'meetings';

/**
 * Version counters per data area. A page that reads e.g. meetings puts `changes.meetings()` into
 * its rxResource params, so it reloads when anything (a dialog opened from the shell, another
 * panel) reports a change.
 */
@Injectable({ providedIn: 'root' })
export class Changes {
  readonly contacts = signal(0);
  readonly meetings = signal(0);

  notify(...topics: ChangeTopic[]): void {
    for (const topic of topics) {
      this[topic].update((v) => v + 1);
    }
  }
}
