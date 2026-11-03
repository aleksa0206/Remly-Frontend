import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Contact } from '../../core/api/models';
import { ContactsApi, MeetingsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { Editors } from '../../shared/editors';
import { Avatar } from '../../shared/ui/avatar';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';
import {
  agoText,
  birthdayText,
  catchUpLabel,
  displayName,
  RELATIONSHIP_LABELS,
} from '../../shared/util/contact-text';
import { todayIso } from '../../shared/util/dates';
import { dueInfo } from '../../shared/util/due';
import { calendarDateText, fullName } from '../../shared/util/format';
import { MeetingRow } from '../meetings/meeting-row';

const HISTORY_LIMIT = 50;

@Component({
  selector: 'app-contact-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    PageHeader,
    EmptyState,
    LoadError,
    Icon,
    Avatar,
    MeetingRow,
  ],
  template: `
    <div class="page">
      @if (contact.error(); as error) {
        <app-page-header title="Contact" backLink="/contacts" backLabel="Contacts" />
        <div class="panel"><app-load-error [error]="error" (retry)="contact.reload()" /></div>
      } @else if (contact.hasValue()) {
        @let c = contact.value();
        <app-page-header [title]="fullName(c)" backLink="/contacts" backLabel="Contacts">
          <button
            type="button"
            class="btn"
            (click)="editors.meeting({ contactIds: [c.id], planned: true })"
          >
            <app-icon name="calendar" /> Plan
          </button>
          <button
            type="button"
            class="btn btn--primary"
            (click)="editors.meeting({ contactIds: [c.id] })"
          >
            <app-icon name="plus" /> Log meeting
          </button>
          <button
            type="button"
            class="btn btn--icon"
            [cdkMenuTriggerFor]="menu"
            aria-label="More actions"
          >
            <app-icon name="more" />
          </button>
        </app-page-header>

        <ng-template #menu>
          <div class="menu" cdkMenu>
            <button
              type="button"
              class="menu__item"
              cdkMenuItem
              (cdkMenuItemTriggered)="editors.contact(c)"
            >
              <app-icon name="pencil" /> Edit
            </button>
            <button
              type="button"
              class="menu__item"
              cdkMenuItem
              (cdkMenuItemTriggered)="patch(c, { isFavorite: !c.isFavorite })"
            >
              <app-icon name="star" />
              {{ c.isFavorite ? 'Remove from favourites' : 'Add to favourites' }}
            </button>
            <button
              type="button"
              class="menu__item"
              cdkMenuItem
              (cdkMenuItemTriggered)="patch(c, { isArchived: !c.isArchived })"
            >
              <app-icon name="archive" /> {{ c.isArchived ? 'Restore' : 'Archive' }}
            </button>
            <div class="menu__separator"></div>
            <button
              type="button"
              class="menu__item menu__item--danger"
              cdkMenuItem
              (cdkMenuItemTriggered)="remove(c)"
            >
              <app-icon name="trash" /> Delete
            </button>
          </div>
        </ng-template>

        @if (c.isArchived) {
          <p class="alert">Archived — hidden from lists and reminders.</p>
        }

        <div class="layout-split">
          <div class="stack">
            @if (planned.value()?.length) {
              <section class="panel" aria-labelledby="planned-title">
                <div class="panel__header">
                  <h2 class="panel__title" id="planned-title">Planned</h2>
                </div>
                <ul class="rows">
                  @for (meeting of planned.value(); track meeting.id) {
                    <li appMeetingRow [meeting]="meeting"></li>
                  }
                </ul>
              </section>
            }

            <section class="panel" aria-labelledby="history-title">
              <div class="panel__header">
                <h2 class="panel__title" id="history-title">
                  Meetings
                  @if (history.value(); as h) {
                    <span class="panel__count">{{ h.meta.total }}</span>
                  }
                </h2>
              </div>
              @if (history.error(); as error) {
                <app-load-error [error]="error" (retry)="history.reload()" />
              } @else if (history.value(); as h) {
                @if (h.data.length) {
                  <ul class="rows">
                    @for (meeting of h.data; track meeting.id) {
                      <li appMeetingRow [meeting]="meeting" [showNotes]="true"></li>
                    }
                  </ul>
                  @if (h.meta.total > h.data.length) {
                    <p class="panel__footer text-secondary">
                      Showing the {{ h.data.length }} most recent meetings.
                    </p>
                  }
                } @else {
                  <app-empty-state
                    icon="history"
                    [title]="'No meetings with ' + displayName(c) + ' yet'"
                    description="Log the last time you saw each other to start the history."
                  />
                }
              }
            </section>
          </div>

          <aside class="panel">
            <div class="panel__body profile">
              <div class="profile__head">
                <app-avatar [person]="c" [size]="48" />
                <div>
                  <p class="profile__name">{{ fullName(c) }}</p>
                  <p class="text-secondary">
                    {{ relationshipLabels[c.relationship] }}
                    @if (c.nickname) {
                      · “{{ c.nickname }}”
                    }
                  </p>
                </div>
              </div>

              <dl class="details">
                <dt>Last met</dt>
                <dd>
                  @if (c.lastMetOn) {
                    {{ calendarDateText(c.lastMetOn) }}
                    <span class="text-meta">({{ agoText(c.lastMetOn, today) }})</span>
                  } @else {
                    <span class="text-secondary">Not yet</span>
                  }
                </dd>
                @if (c.nextPlannedOn) {
                  <dt>Next</dt>
                  <dd>{{ calendarDateText(c.nextPlannedOn) }}</dd>
                }
                <dt>Keep in touch</dt>
                <dd>
                  {{ catchUpLabel(c.catchUpEveryDays) }}
                  @if (catchUpDue(); as due) {
                    <br />
                    <span
                      [class.tone-danger]="due.overdue"
                      [class.tone-warning]="due.tone === 'warning'"
                    >
                      {{ due.overdue ? due.text : 'Due ' + due.text.toLowerCase() }}
                    </span>
                  }
                </dd>
                @if (birthday(); as b) {
                  <dt>Birthday</dt>
                  <dd>{{ b }}</dd>
                }
                @if (c.phone) {
                  <dt>Phone</dt>
                  <dd>
                    <a [href]="'tel:' + c.phone">{{ c.phone }}</a>
                  </dd>
                }
                @if (c.email) {
                  <dt>Email</dt>
                  <dd>
                    <a [href]="'mailto:' + c.email">{{ c.email }}</a>
                  </dd>
                }
              </dl>

              @if (c.notes) {
                <div>
                  <p class="eyebrow">Notes</p>
                  <p class="notes">{{ c.notes }}</p>
                </div>
              }
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .alert {
      margin-bottom: var(--space-4);
    }
    .profile {
      display: grid;
      gap: var(--space-5);
    }
    .profile__head {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .profile__name {
      font-size: var(--font-size-section);
      font-weight: var(--font-weight-semibold);
    }
    .notes {
      margin-top: var(--space-1);
      white-space: pre-line;
    }
  `,
})
export default class ContactDetailPage {
  private readonly contactsApi = inject(ContactsApi);
  private readonly meetingsApi = inject(MeetingsApi);
  private readonly changes = inject(Changes);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly editors = inject(Editors);

  /** Route param `:id`. */
  readonly id = input.required<string>();
  private readonly contactId = computed(() => Number(this.id()));

  protected readonly today = todayIso();
  protected readonly relationshipLabels = RELATIONSHIP_LABELS;
  protected readonly fullName = fullName;
  protected readonly displayName = displayName;
  protected readonly agoText = agoText;
  protected readonly catchUpLabel = catchUpLabel;
  protected readonly calendarDateText = calendarDateText;

  protected readonly contact = rxResource({
    params: () => ({ id: this.contactId(), version: this.changes.contacts() }),
    stream: ({ params }) => this.contactsApi.get(params.id),
  });
  protected readonly planned = rxResource({
    params: () => ({ id: this.contactId(), version: this.changes.meetings() }),
    stream: ({ params }) =>
      this.meetingsApi
        .list({ contactId: params.id, status: 'Planned', order: 'asc', limit: 100 })
        .pipe(map((res) => res.data)),
  });
  protected readonly history = rxResource({
    params: () => ({ id: this.contactId(), version: this.changes.meetings() }),
    stream: ({ params }) =>
      this.meetingsApi.list({
        contactId: params.id,
        status: 'Done,Cancelled',
        order: 'desc',
        limit: HISTORY_LIMIT,
      }),
  });

  protected readonly birthday = computed(() =>
    this.contact.hasValue() ? birthdayText(this.contact.value()) : null,
  );
  protected readonly catchUpDue = computed(() => {
    const c = this.contact.value();
    return c?.catchUpDueOn && !c.nextPlannedOn ? dueInfo(c.catchUpDueOn, this.today) : null;
  });

  protected async patch(contact: Contact, body: { isFavorite?: boolean; isArchived?: boolean }) {
    try {
      await firstValueFrom(this.contactsApi.update(contact.id, body));
      this.changes.notify('contacts');
      if (body.isArchived !== undefined) {
        this.toast.success(body.isArchived ? 'Contact archived.' : 'Contact restored.');
      }
    } catch (err) {
      this.toast.error(toApiError(err).message);
    }
  }

  protected async remove(contact: Contact): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete ${fullName(contact)}?`,
      message:
        'Their details and the meetings only they were in are deleted. Archive them instead to keep the history.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.contactsApi.remove(contact.id));
      // Leave first: reloading this page's contact would only show "not found".
      await this.router.navigateByUrl('/contacts');
      this.changes.notify('contacts', 'meetings');
      this.toast.success(`${fullName(contact)} deleted.`);
    } catch (err) {
      this.toast.error(toApiError(err).message);
    }
  }
}
