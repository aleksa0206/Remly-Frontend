import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../shared/ui/feedback';

@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, RouterLink],
  template: `
    <div class="page">
      <app-empty-state
        icon="shield"
        title="You don't have access to this page"
        description="This belongs to another account."
      >
        <a class="btn" routerLink="/">Go to home</a>
      </app-empty-state>
    </div>
  `,
})
export class ForbiddenPage {}

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyState, RouterLink],
  template: `
    <div class="page">
      <app-empty-state
        icon="file"
        title="Page not found"
        description="The link may be outdated or mistyped."
      >
        <a class="btn" routerLink="/">Go to home</a>
      </app-empty-state>
    </div>
  `,
})
export class NotFoundPage {}
