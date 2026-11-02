import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Meeting, MeetingType } from '../../core/api/models';
import { ContactsApi, MeetingInput, MeetingsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { Avatar } from '../../shared/ui/avatar';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { Icon } from '../../shared/ui/icon';
import { MEETING_TYPE_OPTIONS } from '../../shared/util/contact-text';
import { todayIso } from '../../shared/util/dates';
import { applyServerErrors } from '../../shared/util/forms';
import { fullName, toDateInputValue } from '../../shared/util/format';

export interface MeetingDialogData {
  meeting?: Meeting;
  /** People pre-selected for a new meeting, e.g. from a contact's page. */
  contactIds?: number[];
  /** Plan one ahead instead of logging one that happened. */
  planned?: boolean;
}

@Component({
  selector: 'app-meeting-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  imports: [ReactiveFormsModule, FormField, FieldControl, Avatar, Icon],
  template: `
    <h2 class="dialog__title" id="meeting-dialog-title">{{ title }}</h2>
    <form class="dialog__form" [formGroup]="form" (ngSubmit)="save()" novalidate>
      @if (error(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }

      @if (!editing) {
        <div class="segmented" role="group" aria-label="Kind of entry">
          <button type="button" [attr.aria-pressed]="!isPlanned()" (click)="setPlanned(false)">
            It happened
          </button>
          <button type="button" [attr.aria-pressed]="isPlanned()" (click)="setPlanned(true)">
            Plan ahead
          </button>
        </div>
      }

      <div class="people">
        <span class="people__label" id="people-label">With</span>
        @if (selected().length) {
          <ul class="people__chips" aria-labelledby="people-label">
            @for (person of selected(); track person.id) {
              <li class="chip">
                <app-avatar [person]="person" [size]="20" />
                {{ fullName(person) }}
                <button
                  type="button"
                  class="chip__remove"
                  [attr.aria-label]="'Remove ' + fullName(person)"
                  (click)="remove(person.id)"
                >
                  <app-icon name="x" [size]="12" />
                </button>
              </li>
            }
          </ul>
        }
        <select
          class="select"
          aria-labelledby="people-label"
          [disabled]="!contacts.hasValue()"
          (change)="add($any($event.target))"
        >
          <option value="">
            {{ selected().length ? 'Add someone else…' : 'Choose a contact…' }}
          </option>
          @for (contact of available(); track contact.id) {
            <option [value]="contact.id">{{ fullName(contact) }}</option>
          }
        </select>
        @if (peopleError()) {
          <p class="people__error" role="alert">Choose at least one person.</p>
        }
      </div>

      <div class="form__row">
        <app-field label="Date">
          <input class="input" appFieldControl type="date" formControlName="date" />
        </app-field>
        <app-field label="Time" [optional]="true">
          <input class="input" appFieldControl type="time" formControlName="time" />
        </app-field>
      </div>

      <div class="type">
        <span class="type__label" id="type-label">How</span>
        <div class="segmented" role="group" aria-labelledby="type-label">
          @for (option of typeOptions; track option.value) {
            <button
              type="button"
              [attr.aria-pressed]="form.controls.type.value === option.value"
              (click)="form.controls.type.setValue(option.value); form.markAsDirty()"
            >
              <app-icon [name]="option.icon" [size]="14" /> {{ option.label }}
            </button>
          }
        </div>
      </div>

      <div class="form__row">
        <app-field label="What" [optional]="true">
          <input
            class="input"
            appFieldControl
            formControlName="title"
            placeholder="Coffee, birthday dinner…"
          />
        </app-field>
        <app-field label="Where" [optional]="true">
          <input class="input" appFieldControl formControlName="location" />
        </app-field>
      </div>

      <app-field label="Notes" [optional]="true" [hint]="notesHint()">
        <textarea class="textarea" appFieldControl formControlName="notes" rows="3"></textarea>
      </app-field>

      <div class="dialog__actions">
        <button type="button" class="btn" (click)="ref.close()">Cancel</button>
        <button
          type="submit"
          class="btn btn--primary"
          [disabled]="saving()"
          [attr.aria-busy]="saving()"
        >
          {{ editing ? 'Save' : isPlanned() ? 'Plan meeting' : 'Log meeting' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .segmented {
      justify-self: start;
      flex-wrap: wrap;
    }
    .people,
    .type {
      display: grid;
      gap: 6px;
    }
    .people__label,
    .type__label {
      font-size: var(--font-size-secondary);
      font-weight: var(--font-weight-medium);
    }
    .people__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 2px 0 4px;
      border: 1px solid var(--color-border);
      border-radius: 14px;
      background: var(--color-surface-subtle);
      font-size: var(--font-size-secondary);
    }
    .chip__remove {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--color-text-tertiary);
    }
    .chip__remove:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    .people__error {
      color: var(--color-danger);
      font-size: var(--font-size-meta);
    }
  `,
})
export class MeetingDialog {
  private readonly api = inject(MeetingsApi);
  private readonly changes = inject(Changes);
  protected readonly ref = inject<DialogRef<Meeting>>(DialogRef);
  private readonly data = inject<MeetingDialogData>(DIALOG_DATA);

  protected readonly editing = !!this.data.meeting;
  protected readonly title = this.editing ? 'Edit meeting' : 'New meeting';
  protected readonly typeOptions = MEETING_TYPE_OPTIONS;
  protected readonly fullName = fullName;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly peopleError = signal(false);

  private readonly contactsApi = inject(ContactsApi);
  protected readonly contacts = rxResource({ stream: () => this.contactsApi.listAll() });
  private readonly contactIds = signal<number[]>(
    this.data.meeting?.contacts.map((c) => c.id) ?? this.data.contactIds ?? [],
  );

  // A contact being edited may since have been archived, so the meeting's own list is the fallback.
  protected readonly selected = computed(() => {
    const known = [...(this.contacts.value() ?? []), ...(this.data.meeting?.contacts ?? [])];
    return this.contactIds()
      .map((id) => known.find((c) => c.id === id))
      .filter((c) => c !== undefined);
  });
  protected readonly available = computed(() =>
    (this.contacts.value() ?? []).filter((c) => !this.contactIds().includes(c.id)),
  );

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    planned: [this.data.meeting ? this.data.meeting.status === 'Planned' : !!this.data.planned],
    date: [
      this.data.meeting
        ? toDateInputValue(this.data.meeting.date)
        : this.data.planned
          ? ''
          : todayIso(),
      Validators.required,
    ],
    time: [this.data.meeting?.time ?? ''],
    type: [this.data.meeting?.type ?? ('InPerson' as MeetingType)],
    title: [this.data.meeting?.title ?? '', Validators.maxLength(191)],
    location: [this.data.meeting?.location ?? '', Validators.maxLength(191)],
    notes: [this.data.meeting?.notes ?? '', Validators.maxLength(5000)],
  });

  protected readonly isPlanned = toSignal(this.form.controls.planned.valueChanges, {
    initialValue: this.form.controls.planned.value,
  });
  protected readonly notesHint = computed(() =>
    this.isPlanned() ? 'What you want to talk about.' : 'What you talked about, news, follow-ups.',
  );

  protected setPlanned(planned: boolean): void {
    this.form.controls.planned.setValue(planned);
    if (!planned && !this.form.controls.date.value) {
      this.form.controls.date.setValue(todayIso());
    }
  }

  protected add(select: HTMLSelectElement): void {
    const id = Number(select.value);
    if (id) {
      this.contactIds.update((ids) => [...ids, id]);
      this.peopleError.set(false);
    }
    select.value = '';
  }

  protected remove(id: number): void {
    this.contactIds.update((ids) => ids.filter((x) => x !== id));
  }

  protected save(): void {
    this.peopleError.set(this.contactIds().length === 0);
    if (this.form.invalid || this.peopleError()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const meeting = this.data.meeting;
    const body: Omit<MeetingInput, 'status'> & { status?: MeetingInput['status'] } = {
      contactIds: this.contactIds(),
      date: value.date,
      time: value.time || null,
      type: value.type,
      title: value.title.trim() || null,
      location: value.location.trim() || null,
      notes: value.notes.trim() || null,
    };
    // Editing keeps the status; completing and cancelling are their own actions.
    if (!meeting) body.status = value.planned ? 'Planned' : 'Done';

    this.saving.set(true);
    this.error.set(null);
    (meeting
      ? this.api.update(meeting.id, body)
      : this.api.create({ ...body, status: body.status! })
    )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.changes.notify('meetings', 'contacts');
          this.ref.close(saved);
        },
        error: (err: unknown) => {
          const apiError = toApiError(err);
          if (!applyServerErrors(this.form, apiError)) this.error.set(apiError.message);
        },
      });
  }
}
