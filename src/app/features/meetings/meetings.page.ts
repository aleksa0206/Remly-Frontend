import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MeetingsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { Editors } from '../../shared/editors';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { parseOption, parsePage } from '../../shared/util/query';
import { MeetingRow } from './meeting-row';

const VIEWS = ['upcoming', 'history'] as const;
type View = (typeof VIEWS)[number];

const PAGE_SIZE = 25;

@Component({
  selector: 'app-meetings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, EmptyState, LoadError, Icon, Pagination, MeetingRow],
  template: `
    <div class="page">
      <app-page-header title="Meetings">
        <button type="button" class="btn" (click)="editors.meeting({ planned: true })">
          <app-icon name="calendar" /> Plan
        </button>
        <button type="button" class="btn btn--primary" (click)="editors.meeting()">
          <app-icon name="plus" /> Log meeting
        </button>
      </app-page-header>

      <div class="toolbar">
        <div class="segmented" role="group" aria-label="Show">
          <button
            type="button"
            [attr.aria-pressed]="activeView() === 'upcoming'"
            (click)="navigate('upcoming', 1)"
          >
            Upcoming
          </button>
          <button
            type="button"
            [attr.aria-pressed]="activeView() === 'history'"
            (click)="navigate('history', 1)"
          >
            History
          </button>
        </div>
      </div>

      @if (meetings.error(); as error) {
        <div class="panel"><app-load-error [error]="error" (retry)="meetings.reload()" /></div>
      } @else if (meetings.hasValue()) {
        @if (meetings.value().data.length === 0) {
          <div class="panel">
            @if (activeView() === 'upcoming') {
              <app-empty-state
                icon="calendar"
                title="Nothing planned"
                description="Plan the next coffee, call or dinner and it shows up here."
              >
                <button type="button" class="btn" (click)="editors.meeting({ planned: true })">
                  Plan a meeting
                </button>
              </app-empty-state>
            } @else {
              <app-empty-state
                icon="history"
                title="No meetings yet"
                description="Every time you see someone, log it here to remember when and what you talked about."
              >
                <button type="button" class="btn" (click)="editors.meeting()">Log a meeting</button>
              </app-empty-state>
            }
          </div>
        } @else {
          <div class="panel" [attr.aria-busy]="meetings.isLoading()">
            <ul class="rows">
              @for (meeting of meetings.value().data; track meeting.id) {
                <li appMeetingRow [meeting]="meeting" [showNotes]="activeView() === 'history'"></li>
              }
            </ul>
          </div>
          <app-pagination
            [meta]="meetings.value().meta"
            (pageChange)="navigate(activeView(), $event)"
          />
        }
      } @else {
        <div class="panel skeleton-list" aria-hidden="true">
          @for (row of [1, 2, 3, 4]; track row) {
            <div class="skeleton-row">
              <span class="skeleton" [style.width.%]="30 + row * 9"></span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    app-pagination {
      display: block;
      margin-top: var(--space-3);
    }
    .skeleton-row {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
  `,
})
export default class MeetingsPage {
  private readonly api = inject(MeetingsApi);
  private readonly router = inject(Router);
  private readonly changes = inject(Changes);
  protected readonly editors = inject(Editors);

  /** `?view=` and `?page=` from the URL. */
  readonly view = input<string>();
  readonly page = input<string>();
  protected readonly activeView = computed<View>(
    () => parseOption(this.view(), VIEWS) ?? 'upcoming',
  );

  protected readonly meetings = rxResource({
    params: () => ({
      view: this.activeView(),
      page: parsePage(this.page()),
      version: this.changes.meetings(),
    }),
    stream: ({ params }) =>
      this.api.list(
        params.view === 'upcoming'
          ? { status: 'Planned', order: 'asc', page: params.page, limit: PAGE_SIZE }
          : { status: 'Done,Cancelled', order: 'desc', page: params.page, limit: PAGE_SIZE },
      ),
  });

  protected navigate(view: View, page: number): void {
    void this.router.navigate([], {
      queryParams: { view: view === 'upcoming' ? null : view, page: page > 1 ? page : null },
    });
  }
}
