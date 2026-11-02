import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meeting } from '../../core/api/models';
import { Editors } from '../../shared/editors';
import { Icon } from '../../shared/ui/icon';
import { meetingTypeOption } from '../../shared/util/contact-text';
import { todayIso } from '../../shared/util/dates';
import { dueInfo } from '../../shared/util/due';
import { formatCalendar, fullName } from '../../shared/util/format';
import { MeetingActions } from './meeting-actions';

/**
 * One meeting in a list: a date block, who it was with and the details, then the actions.
 * A planned meeting whose day has passed asks whether it happened. Use inside `<ul class="rows">`.
 */
@Component({
  selector: 'li[appMeetingRow]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'meeting', '[class.meeting--cancelled]': "meeting().status === 'Cancelled'" },
  imports: [RouterLink, CdkMenu, CdkMenuItem, CdkMenuTrigger, Icon],
  template: `
    @let m = meeting();
    <span class="meeting__date" aria-hidden="true">
      <span class="meeting__day">{{ day() }}</span>
      <span class="meeting__month">{{ month() }}</span>
    </span>

    <span class="meeting__main">
      <span class="meeting__people">
        <app-icon [name]="type().icon" [size]="14" class="meeting__type" />
        <span class="visually-hidden">{{ type().label }} with</span>
        @for (person of m.contacts; track person.id; let last = $last) {
          <a [routerLink]="['/contacts', person.id]">{{ fullName(person) }}</a
          >{{ last ? '' : ', ' }}
        }
      </span>
      <span class="meeting__meta">
        <span [class.tone-danger]="overdue()" [class.tone-warning]="when()?.tone === 'warning'">
          {{ whenText() }}
        </span>
        @if (m.title) {
          <span>{{ m.title }}</span>
        }
        @if (m.location) {
          <span><app-icon name="mapPin" [size]="12" /> {{ m.location }}</span>
        }
        @if (m.status === 'Cancelled') {
          <span>Cancelled</span>
        }
      </span>
      @if (showNotes() && m.notes) {
        <span class="meeting__notes">{{ m.notes }}</span>
      }
    </span>

    <span class="row__end">
      @if (overdue()) {
        <button type="button" class="btn btn--sm" [disabled]="busy()" (click)="complete()">
          It happened
        </button>
      }
      <button
        type="button"
        class="btn btn--ghost btn--icon btn--sm"
        [cdkMenuTriggerFor]="menu"
        aria-label="More actions for this meeting"
      >
        <app-icon name="more" />
      </button>
    </span>

    <ng-template #menu>
      <div class="menu" cdkMenu>
        <button type="button" class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="edit()">
          <app-icon name="pencil" /> Edit
        </button>
        @if (m.status === 'Planned') {
          <button type="button" class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="complete()">
            <app-icon name="check" /> Mark as done
          </button>
          <button
            type="button"
            class="menu__item"
            cdkMenuItem
            (cdkMenuItemTriggered)="actions.cancel(m)"
          >
            <app-icon name="x" /> Cancel meeting
          </button>
        }
        <div class="menu__separator"></div>
        <button
          type="button"
          class="menu__item menu__item--danger"
          cdkMenuItem
          (cdkMenuItemTriggered)="actions.remove(m)"
        >
          <app-icon name="trash" /> Delete
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 56px;
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    :host:last-child {
      border-bottom: 0;
    }
    .meeting__date {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 40px;
      padding: 4px 0;
      border-radius: var(--radius-md);
      background: var(--color-surface-sunken);
      line-height: 1.1;
    }
    .meeting__day {
      font-size: 16px;
      font-weight: var(--font-weight-semibold);
    }
    .meeting__month {
      color: var(--color-text-secondary);
      font-size: 11px;
      text-transform: uppercase;
    }
    .meeting__main {
      display: grid;
      flex: 1;
      min-width: 0;
      line-height: 1.35;
    }
    .meeting__people {
      overflow: hidden;
      font-weight: var(--font-weight-medium);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meeting__people a {
      color: var(--color-text);
    }
    .meeting__type {
      margin-right: 6px;
      color: var(--color-text-tertiary);
      vertical-align: -2px;
    }
    .meeting__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--space-3);
      color: var(--color-text-tertiary);
      font-size: var(--font-size-meta);
    }
    .meeting__meta > span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meeting__notes {
      margin-top: 2px;
      color: var(--color-text-secondary);
      font-size: var(--font-size-secondary);
      white-space: pre-line;
    }
    :host(.meeting--cancelled) .meeting__people {
      color: var(--color-text-tertiary);
      text-decoration: line-through;
    }
  `,
})
export class MeetingRow {
  readonly meeting = input.required<Meeting>();
  readonly showNotes = input(false);

  protected readonly actions = inject(MeetingActions);
  private readonly editors = inject(Editors);
  protected readonly busy = signal(false);
  protected readonly fullName = fullName;

  protected readonly day = computed(() => formatCalendar(this.meeting().date, 'd'));
  protected readonly month = computed(() => formatCalendar(this.meeting().date, 'MMM'));
  protected readonly type = computed(() => meetingTypeOption(this.meeting().type));
  protected readonly when = computed(() =>
    this.meeting().status === 'Planned' ? dueInfo(this.meeting().date, todayIso()) : null,
  );
  protected readonly overdue = computed(() => !!this.when()?.overdue);
  protected readonly whenText = computed(() => {
    const m = this.meeting();
    const time = m.time ? ` at ${m.time}` : '';
    if (m.status !== 'Planned') return formatCalendar(m.date, 'EEEE, d MMMM y') + time;
    const when = this.when()!;
    return when.overdue ? `Was planned for ${formatCalendar(m.date, 'd MMM')}` : when.text + time;
  });

  protected async complete(): Promise<void> {
    this.busy.set(true);
    await this.actions.complete(this.meeting());
    this.busy.set(false);
  }

  protected edit(): void {
    void this.editors.meeting({ meeting: this.meeting() });
  }
}
