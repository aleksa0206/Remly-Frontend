import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <main class="auth">
      <div class="auth__column">
        <div class="auth__brand">
          <p class="auth__logo">remly<span class="auth__dot" aria-hidden="true">.</span></p>
          <p class="auth__tagline">People · Meetings · Keeping in touch</p>
        </div>
        <div class="auth__panel">
          <router-outlet />
        </div>
      </div>
    </main>
  `,
  styles: `
    .auth {
      display: grid;
      place-items: start center;
      min-height: 100%;
      padding: 12vh var(--space-4) var(--space-8);
    }
    .auth__column {
      display: grid;
      gap: var(--space-5);
      width: 100%;
      max-width: 400px;
    }
    .auth__brand {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .auth__logo {
      font-family: var(--font-family-display);
      font-size: 44px;
      font-weight: 500;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .auth__dot {
      color: var(--color-accent);
    }
    .auth__tagline {
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .auth__panel {
      padding: var(--space-8);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    @media (max-width: 480px) {
      .auth {
        padding-top: var(--space-8);
      }
      .auth__panel {
        padding: var(--space-6) var(--space-5);
      }
    }
  `,
})
export class AuthLayout {}
