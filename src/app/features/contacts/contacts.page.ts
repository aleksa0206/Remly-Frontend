import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Contact, RELATIONSHIPS } from '../../core/api/models';
import { ContactQuery, ContactsApi, ContactSort } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { Editors } from '../../shared/editors';
import { Avatar } from '../../shared/ui/avatar';
import { EmptyState, LoadError } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { Pagination } from '../../shared/ui/pagination';
import { SearchInput } from '../../shared/ui/search-input';
import { agoText, RELATIONSHIP_LABELS } from '../../shared/util/contact-text';
import { todayIso } from '../../shared/util/dates';
import { dueInfo } from '../../shared/util/due';
import { fullName } from '../../shared/util/format';
import { parseOption, parsePage } from '../../shared/util/query';

const FILTERS = ['all', 'favorites', 'catchUp', 'archived'] as const;
type Filter = (typeof FILTERS)[number];
const SORTS = ['name', 'lastMet', 'catchUp'] as const;
const PAGE_SIZE = 50;

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  favorites: 'Favourites',
  catchUp: 'Catch up',
  archived: 'Archived',
};

@Component({
  selector: 'app-contacts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, EmptyState, LoadError, Icon, Avatar, Pagination, SearchInput],
  template: `
    <div class="page">
      <app-page-header title="Contacts">
        <button type="button" class="btn btn--primary" (click)="editors.contact()">
          <app-icon name="userPlus" /> Add contact
        </button>
      </app-page-header>

      <div class="toolbar">
        <app-search-input
          label="Search by name, phone or email"
          [value]="search() ?? ''"
          (search)="update({ search: $event || null })"
        />
        <div class="segmented" role="group" aria-label="Show">
          @for (f of filters; track f) {
            <button
              type="button"
              [attr.aria-pressed]="activeFilter() === f"
              (click)="update({ filter: f === 'all' ? null : f })"
            >
              {{ filterLabels[f] }}
            </button>
          }
        </div>
        <span class="toolbar__spacer"></span>
        <label class="visually-hidden" for="relationship-filter">Relationship</label>
        <select
          id="relationship-filter"
          class="select"
          [value]="activeRelationship() ?? ''"
          (change)="update({ relationship: $any($event.target).value || null })"
        >
          <option value="">Everyone</option>
          @for (r of relationships; track r) {
            <option [value]="r">{{ relationshipLabels[r] }}</option>
          }
        </select>
        <label class="visually-hidden" for="contact-sort">Sort by</label>
        <select
          id="contact-sort"
          class="select"
          [value]="activeSort()"
          (change)="update({ sort: $any($event.target).value })"
        >
          <option value="name">Name</option>
          <option value="lastMet">Recently seen</option>
          <option value="catchUp">Catch up soonest</option>
        </select>
      </div>

      @if (contacts.error(); as error) {
        <div class="panel"><app-load-error [error]="error" (retry)="contacts.reload()" /></div>
      } @else if (contacts.hasValue()) {
        @if (contacts.value().data.length === 0) {
          <div class="panel">
            @if (isFiltered()) {
              <app-empty-state
                icon="search"
                title="No one matches"
                description="Try another name or clear the filters."
              />
            } @else {
              <app-empty-state
                icon="users"
                title="No contacts yet"
                description="Add the people you want to keep in touch with."
              >
                <button type="button" class="btn" (click)="editors.contact()">Add contact</button>
              </app-empty-state>
            }
          </div>
        } @else {
          <div class="panel" [attr.aria-busy]="contacts.isLoading()">
            <ul class="rows">
              @for (contact of contacts.value().data; track contact.id) {
                <li>
                  <app-avatar [person]="contact" [size]="32" />
                  <a class="row__main contact-link" [routerLink]="['/contacts', contact.id]">
                    <span class="row__title">
                      {{ fullName(contact) }}
                      @if (contact.nickname) {
                        <span class="text-meta">“{{ contact.nickname }}”</span>
                      }
                    </span>
                    <span class="row__meta">{{ meta(contact) }}</span>
                  </a>
                  <span class="row__end">
                    @if (catchUp(contact); as due) {
                      <span class="badge" [class.badge--due]="due.overdue">{{ due.text }}</span>
                    }
                    @if (contact.isFavorite) {
                      <app-icon name="star" class="favorite" />
                      <span class="visually-hidden">Favourite</span>
                    }
                  </span>
                </li>
              }
            </ul>
          </div>
          <app-pagination
            [meta]="contacts.value().meta"
            (pageChange)="update({ page: $event }, false)"
          />
        }
      }
    </div>
  `,
  styles: `
    app-pagination {
      display: block;
      margin-top: var(--space-3);
    }
    .contact-link {
      color: var(--color-text);
    }
    .contact-link:hover {
      text-decoration: none;
    }
    .contact-link:hover .row__title {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .favorite {
      color: var(--color-warning);
    }
    .badge--due {
      background: var(--color-danger-subtle);
      color: var(--color-danger);
    }
  `,
})
export default class ContactsPage {
  private readonly api = inject(ContactsApi);
  private readonly router = inject(Router);
  private readonly changes = inject(Changes);
  protected readonly editors = inject(Editors);

  // Query params from the URL.
  readonly search = input<string>();
  readonly filter = input<string>();
  readonly relationship = input<string>();
  readonly sort = input<string>();
  readonly page = input<string>();

  protected readonly filters = FILTERS;
  protected readonly filterLabels = FILTER_LABELS;
  protected readonly relationships = RELATIONSHIPS;
  protected readonly relationshipLabels = RELATIONSHIP_LABELS;
  protected readonly fullName = fullName;

  protected readonly activeFilter = computed(() => parseOption(this.filter(), FILTERS) ?? 'all');
  protected readonly activeRelationship = computed(() =>
    parseOption(this.relationship(), RELATIONSHIPS),
  );
  protected readonly activeSort = computed<ContactSort>(
    () =>
      parseOption(this.sort(), SORTS) ?? (this.activeFilter() === 'catchUp' ? 'catchUp' : 'name'),
  );
  protected readonly isFiltered = computed(
    () => !!this.search() || this.activeFilter() !== 'all' || !!this.activeRelationship(),
  );

  protected readonly contacts = rxResource({
    params: (): ContactQuery & { version: number } => {
      const filter = this.activeFilter();
      return {
        search: this.search() || undefined,
        relationship: this.activeRelationship(),
        isFavorite: filter === 'favorites' ? true : undefined,
        isArchived: filter === 'archived',
        dueBy: filter === 'catchUp' ? todayIso() : undefined,
        sort: this.activeSort(),
        page: parsePage(this.page()),
        limit: PAGE_SIZE,
        version: this.changes.contacts(),
      };
    },
    stream: ({ params: { version: _version, ...query } }) => this.api.list(query),
  });

  protected meta(contact: Contact): string {
    const parts = [RELATIONSHIP_LABELS[contact.relationship]];
    parts.push(
      contact.lastMetOn ? `Seen ${agoText(contact.lastMetOn, todayIso())}` : 'Not met yet',
    );
    if (contact.nextPlannedOn) parts.push('Meeting planned');
    return parts.join(' · ');
  }

  /** Only shown when it is close or past, and nothing is planned yet. */
  protected catchUp(contact: Contact) {
    if (!contact.catchUpDueOn || contact.nextPlannedOn) return null;
    const due = dueInfo(contact.catchUpDueOn, todayIso());
    if (!due || (!due.overdue && due.tone === 'none')) return null;
    return { overdue: due.overdue, text: due.overdue ? 'Catch up' : 'Catch up today' };
  }

  /** Changing any filter goes back to the first page. */
  protected update(params: Record<string, string | number | null>, resetPage = true): void {
    void this.router.navigate([], {
      queryParams: resetPage ? { ...params, page: null } : params,
      queryParamsHandling: 'merge',
    });
  }
}
