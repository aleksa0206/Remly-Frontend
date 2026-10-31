import { inject, Injectable } from '@angular/core';
import { Contact, Meeting } from '../core/api/models';
import type { MeetingDialogData } from '../features/meetings/meeting-dialog';
import { ToastService } from './ui/toast';
import { FormDialogService } from './ui/dialogs';
import { displayName } from './util/contact-text';

/**
 * Opens the create/edit dialogs from anywhere (shell "New" menu, page buttons, row actions).
 * The dialogs save and report the change themselves; this only shows the confirmation.
 * Dialogs are imported on first use so the forms code stays out of the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class Editors {
  private readonly dialogs = inject(FormDialogService);
  private readonly toast = inject(ToastService);

  async contact(contact?: Contact): Promise<Contact | undefined> {
    const { ContactDialog } = await import('../features/contacts/contact-dialog');
    const saved = await this.dialogs.open<Contact, { contact?: Contact }>(
      ContactDialog,
      { contact },
      'contact-dialog-title',
    );
    if (saved && !contact) this.toast.success(`${displayName(saved)} added.`);
    return saved;
  }

  async meeting(data: MeetingDialogData = {}): Promise<Meeting | undefined> {
    const { MeetingDialog } = await import('../features/meetings/meeting-dialog');
    const saved = await this.dialogs.open<Meeting, MeetingDialogData>(
      MeetingDialog,
      data,
      'meeting-dialog-title',
    );
    if (saved && !data.meeting) {
      this.toast.success(saved.status === 'Planned' ? 'Meeting planned.' : 'Meeting logged.');
    }
    return saved;
  }
}
