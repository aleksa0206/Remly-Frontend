import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Contact, Relationship, RELATIONSHIPS } from '../../core/api/models';
import { ContactInput, ContactsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { FieldControl, FormField } from '../../shared/ui/form-field';
import { CATCH_UP_OPTIONS, RELATIONSHIP_LABELS } from '../../shared/util/contact-text';
import { applyServerErrors } from '../../shared/util/forms';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Day and month go together; the year is optional. Feb 29 is fine without a year.
function birthdayValidator(group: AbstractControl): ValidationErrors | null {
  const { day, month, year } = group.value as {
    day: number | null;
    month: number | null;
    year: number | null;
  };
  if (day === null && month === null) {
    return year === null ? null : { birthday: 'Add the day and month too.' };
  }
  if (day === null || month === null) return { birthday: 'Pick both the day and the month.' };
  const daysInMonth = new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();
  return day <= daysInMonth ? null : { birthday: 'That date does not exist.' };
}

@Component({
  selector: 'app-contact-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  imports: [ReactiveFormsModule, FormField, FieldControl],
  template: `
    <h2 class="dialog__title" id="contact-dialog-title">
      {{ editing ? 'Edit contact' : 'New contact' }}
    </h2>
    <form class="dialog__form" [formGroup]="form" (ngSubmit)="save()" novalidate>
      @if (error(); as message) {
        <p class="form-error" role="alert">{{ message }}</p>
      }
      <div class="form__row">
        <app-field label="First name">
          <input class="input" appFieldControl formControlName="firstName" cdkFocusInitial />
        </app-field>
        <app-field label="Last name" [optional]="true">
          <input class="input" appFieldControl formControlName="lastName" />
        </app-field>
      </div>

      <div class="form__row">
        <app-field label="Nickname" [optional]="true">
          <input class="input" appFieldControl formControlName="nickname" />
        </app-field>
        <app-field label="Relationship">
          <select class="select" appFieldControl formControlName="relationship">
            @for (r of relationships; track r) {
              <option [value]="r">{{ relationshipLabels[r] }}</option>
            }
          </select>
        </app-field>
      </div>

      <div class="form__row">
        <app-field label="Phone" [optional]="true">
          <input class="input" appFieldControl type="tel" formControlName="phone" />
        </app-field>
        <app-field label="Email" [optional]="true">
          <input class="input" appFieldControl type="email" formControlName="email" />
        </app-field>
      </div>

      <fieldset class="birthday" formGroupName="birthday">
        <legend class="birthday__legend">
          Birthday <span class="birthday__optional">(optional, year too)</span>
        </legend>
        <div class="birthday__inputs">
          <select class="select" formControlName="day" aria-label="Birthday day">
            <option [ngValue]="null">Day</option>
            @for (d of days; track d) {
              <option [ngValue]="d">{{ d }}</option>
            }
          </select>
          <select class="select" formControlName="month" aria-label="Birthday month">
            <option [ngValue]="null">Month</option>
            @for (m of months; track m; let i = $index) {
              <option [ngValue]="i + 1">{{ m }}</option>
            }
          </select>
          <input
            class="input"
            type="number"
            formControlName="year"
            placeholder="Year"
            aria-label="Birth year"
            min="1900"
            max="2100"
          />
        </div>
        @if (form.controls.birthday.errors?.['birthday']; as message) {
          <p class="field__error" role="alert">{{ message }}</p>
        }
      </fieldset>

      <app-field
        label="Keep in touch"
        hint="Remly reminds you when it's been longer than this since you last met."
      >
        <select class="select" appFieldControl formControlName="catchUpEveryDays">
          @for (option of catchUpOptions; track option.value) {
            <option [ngValue]="option.value">{{ option.label }}</option>
          }
        </select>
      </app-field>

      <app-field label="Notes" [optional]="true" hint="Partner, kids, likes, things to ask about.">
        <textarea class="textarea" appFieldControl formControlName="notes" rows="3"></textarea>
      </app-field>

      <label class="checkbox">
        <input type="checkbox" formControlName="isFavorite" />
        Favourite
      </label>

      <div class="dialog__actions">
        <button type="button" class="btn" (click)="ref.close()">Cancel</button>
        <button
          type="submit"
          class="btn btn--primary"
          [disabled]="saving()"
          [attr.aria-busy]="saving()"
        >
          {{ editing ? 'Save' : 'Add contact' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .birthday {
      display: grid;
      gap: 6px;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .birthday__legend {
      margin-bottom: 6px;
      padding: 0;
      font-size: var(--font-size-secondary);
      font-weight: var(--font-weight-medium);
    }
    .birthday__optional {
      color: var(--color-text-tertiary);
      font-weight: var(--font-weight-regular);
    }
    .birthday__inputs {
      display: grid;
      grid-template-columns: 1fr 2fr 1.2fr;
      gap: var(--space-2);
    }
    .field__error {
      color: var(--color-danger);
      font-size: var(--font-size-meta);
    }
  `,
})
export class ContactDialog {
  private readonly api = inject(ContactsApi);
  private readonly changes = inject(Changes);
  protected readonly ref = inject<DialogRef<Contact>>(DialogRef);
  private readonly contact = inject<{ contact?: Contact }>(DIALOG_DATA).contact;

  protected readonly editing = !!this.contact;
  protected readonly relationships = RELATIONSHIPS;
  protected readonly relationshipLabels = RELATIONSHIP_LABELS;
  protected readonly catchUpOptions = CATCH_UP_OPTIONS;
  protected readonly months = MONTHS;
  protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    firstName: [this.contact?.firstName ?? '', [Validators.required, Validators.maxLength(100)]],
    lastName: [this.contact?.lastName ?? '', Validators.maxLength(100)],
    nickname: [this.contact?.nickname ?? '', Validators.maxLength(100)],
    relationship: [this.contact?.relationship ?? ('Friend' as Relationship)],
    phone: [this.contact?.phone ?? '', Validators.maxLength(50)],
    email: [this.contact?.email ?? '', [Validators.email, Validators.maxLength(191)]],
    birthday: this.fb.group(
      {
        day: [this.contact?.birthdayDay ?? (null as number | null)],
        month: [this.contact?.birthdayMonth ?? (null as number | null)],
        year: [
          this.contact?.birthdayYear ?? (null as number | null),
          [Validators.min(1900), Validators.max(2100)],
        ],
      },
      { validators: birthdayValidator },
    ),
    catchUpEveryDays: [this.contact?.catchUpEveryDays ?? (null as number | null)],
    notes: [this.contact?.notes ?? '', Validators.maxLength(5000)],
    isFavorite: [this.contact?.isFavorite ?? false],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const { day, month, year } = value.birthday;
    const body: ContactInput = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim() || null,
      nickname: value.nickname.trim() || null,
      relationship: value.relationship,
      phone: value.phone.trim() || null,
      email: value.email.trim() || null,
      birthday: day !== null && month !== null ? { day, month, year: year || null } : null,
      catchUpEveryDays: value.catchUpEveryDays,
      notes: value.notes.trim() || null,
      isFavorite: value.isFavorite,
    };
    this.saving.set(true);
    this.error.set(null);
    (this.contact ? this.api.update(this.contact.id, body) : this.api.create(body))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.changes.notify('contacts');
          this.ref.close(saved);
        },
        error: (err: unknown) => {
          const apiError = toApiError(err);
          if (!applyServerErrors(this.form, apiError)) this.error.set(apiError.message);
        },
      });
  }
}
