import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import { apiUrl, toParams } from './http';
import {
  Contact,
  Dashboard,
  Meeting,
  MeetingStatus,
  MeetingType,
  Paged,
  Relationship,
  User,
} from './models';

// One service per backend resource. Components never build URLs themselves.

const MAX_PAGE_SIZE = 100;

/** Every page of a list (lookups such as the contact picker). */
function fetchAll<T>(fetchPage: (page: number) => Observable<Paged<T>>): Observable<T[]> {
  return fetchPage(1).pipe(
    expand((res) => (res.meta.page < res.meta.totalPages ? fetchPage(res.meta.page + 1) : EMPTY)),
    reduce<Paged<T>, T[]>((all, res) => all.concat(res.data), []),
  );
}

export type PageParams = { page?: number | undefined; limit?: number | undefined };

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  update(body: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Observable<User> {
    return this.http.put<User>(apiUrl('/users/me'), body);
  }
}

export type ContactSort = 'name' | 'lastMet' | 'catchUp';

export type ContactQuery = PageParams & {
  search?: string | undefined;
  relationship?: Relationship | undefined;
  isFavorite?: boolean | undefined;
  isArchived?: boolean | undefined;
  /** `YYYY-MM-DD`: catch-up date on or before this day. */
  dueBy?: string | undefined;
  sort?: ContactSort | undefined;
};

export type ContactInput = {
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  relationship: Relationship;
  birthday: { day: number; month: number; year: number | null } | null;
  notes: string | null;
  catchUpEveryDays: number | null;
  isFavorite: boolean;
};

@Injectable({ providedIn: 'root' })
export class ContactsApi {
  private readonly http = inject(HttpClient);

  list(query: ContactQuery): Observable<Paged<Contact>> {
    return this.http.get<Paged<Contact>>(apiUrl('/contacts'), { params: toParams(query) });
  }
  listAll(query: Omit<ContactQuery, 'page' | 'limit'> = {}): Observable<Contact[]> {
    return fetchAll((page) => this.list({ ...query, page, limit: MAX_PAGE_SIZE }));
  }
  get(id: number): Observable<Contact> {
    return this.http.get<Contact>(apiUrl(`/contacts/${id}`));
  }
  create(body: ContactInput): Observable<Contact> {
    return this.http.post<Contact>(apiUrl('/contacts'), body);
  }
  update(id: number, body: Partial<ContactInput> & { isArchived?: boolean }): Observable<Contact> {
    return this.http.put<Contact>(apiUrl(`/contacts/${id}`), body);
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/contacts/${id}`));
  }
}

export type MeetingQuery = PageParams & {
  /** Comma-separated, e.g. `Planned` or `Done,Cancelled`. */
  status?: string | undefined;
  contactId?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  order?: 'asc' | 'desc' | undefined;
};

export type MeetingInput = {
  contactIds: number[];
  date: string;
  time: string | null;
  status: MeetingStatus;
  type: MeetingType;
  title: string | null;
  location: string | null;
  notes: string | null;
};

@Injectable({ providedIn: 'root' })
export class MeetingsApi {
  private readonly http = inject(HttpClient);

  list(query: MeetingQuery): Observable<Paged<Meeting>> {
    return this.http.get<Paged<Meeting>>(apiUrl('/meetings'), { params: toParams(query) });
  }
  create(body: MeetingInput): Observable<Meeting> {
    return this.http.post<Meeting>(apiUrl('/meetings'), body);
  }
  update(id: number, body: Partial<MeetingInput>): Observable<Meeting> {
    return this.http.put<Meeting>(apiUrl(`/meetings/${id}`), body);
  }
  /** Planned → Done; without a date the server uses the planned day (or today if still ahead). */
  complete(id: number, body: { date?: string; notes?: string | null } = {}): Observable<Meeting> {
    return this.http.post<Meeting>(apiUrl(`/meetings/${id}/complete`), body);
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(apiUrl(`/meetings/${id}`));
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);

  get(today: string): Observable<Dashboard> {
    return this.http.get<Dashboard>(apiUrl('/dashboard'), { params: toParams({ today }) });
  }
}
