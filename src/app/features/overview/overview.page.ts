import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Contact } from '../../core/api/models';
import { DashboardApi } from '../../core/api/resources';
import { AuthService } from '../../core/auth/auth.service';
import { Changes } from '../../core/changes';
import { Editors } from '../../shared/editors';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { agoText } from '../../shared/util/contact-text';
import { todayIso } from '../../shared/util/dates';
import { dueInfo } from '../../shared/util/due';
import { fullName } from '../../shared/util/format';
import { MeetingRow } from '../meetings/meeting-row';

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, EmptyState, LoadError, Icon, Avatar, MeetingRow],
  template: `
    <div class="page">
      <app-page-header [title]="greeting()">
        <button type="button" class="btn" (click)="editors.meeting({ planned: true })">
          <app-icon name="calendar" /> Plan
        </button>
        <button type="button" class="btn btn--primary" (click)="editors.meeting()">
          <app-icon name="plus" /> Log meeting
        </button>
      </app-page-header>

      @if (dashboard.error(); as error) {
        <div class="panel"><app-load-error [error]="error" (retry)="dashboard.reload()" /></div>
      } @else if (dashboard.hasValue()) {
        @let d = dashboard.value();
        @if (d.stats.contacts === 0) {
          <div class="panel">
            <app-empty-state
              icon="users"
              title="Welcome to Remly"
              description="Add the people who matter to you. Remly remembers when you last saw them and reminds you when it's been too long."
            >
              <button type="button" class="btn btn--primary" (click)="editors.contact()">
                Add your first contact
              </button>
            </app-empty-state>
          </div>
        } @else {
          <div class="panel figures">
            <a class="figure figure--link" routerLink="/contacts">
              <span class="figure__label">Contacts</span>
              <span class="figure__value">{{ d.stats.contacts }}</span>
            </a>
            <a class="figure figure--link" routerLink="/meetings">
              <span class="figure__label">Planned</span>
              <span class="figure__value">{{ d.stats.plannedTotal }}</span>
              <span class="figure__hint">next two weeks</span>
            </a>
            <a
              class="figure figure--link"
              routerLink="/meetings"
              [queryParams]="{ view: 'history' }"
            >
              <span class="figure__label">Met</span>
              <span class="figure__value">{{ d.stats.metLast30Days }}</span>
              <span class="figure__hint">last 30 days</span>
            </a>
          </div>

          <div class="layout-split">
            <div class="stack">
              <section class="panel" aria-labelledby="upcoming-title">
                <div class="panel__header">
                  <h2 class="panel__title" id="upcoming-title">Coming up</h2>
                  <a class="btn btn--ghost btn--sm" routerLink="/meetings">All</a>
                </div>
                @if (d.upcoming.length) {
                  <ul class="rows">
                    @for (meeting of d.upcoming; track meeting.id) {
                      <li appMeetingRow [meeting]="meeting"></li>
                    }
                  </ul>
                } @else {
                  <app-empty-state
                    icon="calendar"
                    title="Nothing planned for the next two weeks"
                    description="Plan a coffee or a call with someone you haven't seen in a while."
                  />
                }
              </section>

              <section class="panel" aria-labelledby="recent-title">
                <div class="panel__header">
                  <h2 class="panel__title" id="recent-title">Recently</h2>
                  <a
                    class="btn btn--ghost btn--sm"
                    routerLink="/meetings"
                    [queryParams]="{ view: 'history' }"
                    >History</a
                  >
                </div>
                @if (d.recent.length) {
                  <ul class="rows">
                    @for (meeting of d.recent; track meeting.id) {
                      <li appMeetingRow [meeting]="meeting"></li>
                    }
                  </ul>
                } @else {
                  <app-empty-state
                    icon="history"
                    title="No meetings logged yet"
                    description="Log when you see someone to keep track of it."
                  />
                }
              </section>
            </div>

            <div class="stack">
              <section class="panel" aria-labelledby="catch-up-title">
                <div class="panel__header">
                  <h2 class="panel__title" id="catch-up-title">Time to catch up</h2>
                </div>
                @if (d.catchUp.length) {
                  <ul class="rows">
                    @for (contact of d.catchUp; track contact.id) {
                      <li>
                        <app-avatar [person]="contact" />
                        <a class="row__main person-link" [routerLink]="['/contacts', contact.id]">
                          <span class="row__title">{{ fullName(contact) }}</span>
                          <span class="row__meta" [class.tone-danger]="isOverdue(contact)">
                            {{ catchUpText(contact) }}
                          </span>
                        </a>
                        <button
                          type="button"
                          class="btn btn--sm"
                          [attr.aria-label]="'Plan a meeting with ' + fullName(contact)"
                          (click)="editors.meeting({ contactIds: [contact.id], planned: true })"
                        >
                          Plan
                        </button>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="panel__body text-secondary">
                    You're up to date. Set "Keep in touch" on a contact to get reminders.
                  </p>
                }
              </section>

              <section class="panel" aria-labelledby="birthdays-title">
                <div class="panel__header">
                  <h2 class="panel__title" id="birthdays-title">Birthdays</h2>
                  <span class="text-meta">next 30 days</span>
                </div>
                @if (d.birthdays.length) {
                  <ul class="rows">
                    @for (b of d.birthdays; track b.contact.id) {
                      <li>
                        <app-icon name="cake" class="cake" />
                        <a class="row__main person-link" [routerLink]="['/contacts', b.contact.id]">
                          <span class="row__title">{{ fullName(b.contact) }}</span>
                          <span class="row__meta" [class.tone-warning]="isToday(b.date)">
                            {{ dayText(b.date) }}{{ b.turns ? ' · turns ' + b.turns : '' }}
                          </span>
                        </a>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="panel__body text-secondary">No birthdays coming up.</p>
                }
              </section>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .figures {
      margin-bottom: var(--space-6);
    }
    .figure--link {
      color: var(--color-text);
    }
    .figure--link:hover {
      background: var(--color-surface-hover);
      text-decoration: none;
    }
    .person-link {
      color: var(--color-text);
    }
    .cake {
      color: var(--color-text-tertiary);
    }
  `,
})
export default class OverviewPage {
  private readonly api = inject(DashboardApi);
  private readonly changes = inject(Changes);
  private readonly user = inject(AuthService).user;
  protected readonly editors = inject(Editors);
  protected readonly fullName = fullName;

  protected readonly dashboard = rxResource({
    params: () => ({
      today: todayIso(),
      contacts: this.changes.contacts(),
      meetings: this.changes.meetings(),
    }),
    stream: ({ params }) => this.api.get(params.today),
  });

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = this.user()?.firstName;
    return name ? `${part}, ${name}` : part;
  });

  protected isOverdue(contact: Contact): boolean {
    return !!contact.catchUpDueOn && contact.catchUpDueOn.slice(0, 10) < todayIso();
  }

  protected catchUpText(contact: Contact): string {
    const seen = contact.lastMetOn
      ? `Seen ${agoText(contact.lastMetOn, todayIso())}`
      : 'Not met yet';
    const due = dueInfo(contact.catchUpDueOn, todayIso());
    return due && !due.overdue ? `${seen} · due ${due.text.toLowerCase()}` : seen;
  }

  protected isToday(date: string): boolean {
    return date.slice(0, 10) === todayIso();
  }

  protected dayText(date: string): string {
    return dueInfo(date, todayIso())!.text;
  }
}
