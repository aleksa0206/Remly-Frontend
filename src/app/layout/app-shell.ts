import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { Editors } from '../shared/editors';
import { Avatar } from '../shared/ui/avatar';
import { Icon, IconName } from '../shared/ui/icon';
import { FullNamePipe } from '../shared/util/format';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Overview', path: '/', icon: 'home', exact: true },
  { label: 'Contacts', path: '/contacts', icon: 'users' },
  { label: 'Meetings', path: '/meetings', icon: 'calendar' },
];

// Phones: the same places plus the account, since there is no sidebar.
const TABS: NavItem[] = [...NAV, { label: 'Account', path: '/account', icon: 'user' }];

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    Icon,
    Avatar,
    FullNamePipe,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly editors = inject(Editors);
  protected readonly nav = NAV;
  protected readonly tabs = TABS;
}
