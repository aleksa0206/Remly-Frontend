import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Meeting } from '../../core/api/models';
import { MeetingsApi } from '../../core/api/resources';
import { Changes } from '../../core/changes';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { ToastService } from '../../shared/ui/toast';

/** Meeting actions shared by every list a meeting appears in. Resolve to whether it worked. */
@Injectable({ providedIn: 'root' })
export class MeetingActions {
  private readonly api = inject(MeetingsApi);
  private readonly changes = inject(Changes);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  complete(meeting: Meeting): Promise<boolean> {
    return this.run(this.api.complete(meeting.id), 'Marked as done.');
  }

  async cancel(meeting: Meeting): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: 'Cancel this meeting?',
      message: 'It stays in the history as cancelled and no longer counts as planned.',
      confirmLabel: 'Cancel meeting',
      tone: 'danger',
    });
    return (
      ok && this.run(this.api.update(meeting.id, { status: 'Cancelled' }), 'Meeting cancelled.')
    );
  }

  async remove(meeting: Meeting): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: 'Delete this meeting?',
      message: 'It is removed from the history of everyone in it. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    return ok && this.run(this.api.remove(meeting.id), 'Meeting deleted.');
  }

  private async run(request: ReturnType<MeetingsApi['remove']>, message: string) {
    try {
      await firstValueFrom(request);
      // Meetings drive each contact's "last met" and "catch up" dates.
      this.changes.notify('meetings', 'contacts');
      this.toast.success(message);
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).message);
      return false;
    }
  }
}
