<p align="center"><strong>People · Meetings · Keeping in touch</strong></p>

# Remly — Frontend

Angular client for Remly: a personal contacts app that remembers when you last saw someone, what you talked about and when you planned to meet again, and reminds you who you haven't seen in a while.

- Backend: Remly-Backend, expected next to this repository

## What's inside

- **Overview** — what is coming up in the next two weeks (planned meetings, including ones whose day has passed and still need an "It happened"), who is due for a catch-up, birthdays in the next 30 days and the latest meetings.
- **Contacts** — search by name, phone or email; filters for favourites, catch-up and archived; filter by relationship; sort by name, recently seen or catch-up date.
- **Contact page** — details, birthday, "keep in touch" interval, notes, planned meetings and the full meeting history with notes.
- **Meetings** — upcoming and history; log a meeting that happened or plan one ahead with one or more people, a time, a place and notes; mark planned ones as done, cancel or delete them.
- **Account** — personal details and two-factor authentication.
- **Installable (PWA)** — add it to the home screen on Android and iOS.

## Design

Same design system as the other apps (calm, quiet, content first) with Remly's own accent:

- warm paper background, white working surfaces, charcoal text and one plum accent;
- colour always carries meaning (action, overdue, due today) and is paired with text or an icon;
- IBM Plex Sans for the interface, Newsreader for page titles and the wordmark;
- thin borders instead of shadows, lists as compact rows;
- on phones (< 900 px): a top bar and a bottom tab bar.

## Tech stack

Angular 22 (standalone components, signals, `rxResource`) · Angular CDK (dialogs, menus, overlays) · SCSS design tokens · Vitest · nginx · Docker

No UI component library and no state library: the look is built from `src/styles/_tokens.scss`, and list state (filters, view, page) lives in the URL.

## Running locally

```bash
npm install
npm start          # http://localhost:4200, expects the API at http://localhost:4000
npm test           # unit tests (Vitest)
npm run build      # production build into dist/
```

Set `FRONTEND_URL=http://localhost:4200` in the backend `.env`. The API URL lives in `src/environments/`. Create an account at `/register`.

## Project structure

```
src/app/
  core/       API contracts and one service per resource, error normalization, auth (session,
              interceptor, guards), change notifications
  shared/     UI primitives (form field, dialogs, toast, icons), utilities (dates, due dates,
              contact texts), editors (create/edit dialogs from anywhere)
  layout/     app shell (sidebar / top bar + tab bar), auth layout, 403/404
  features/   overview, contacts, meetings, account, auth
src/styles/   tokens → CSS variables, mixins, reset, base primitives
```

## Notable decisions

- **Access token in memory only.** The session is restored through the httpOnly refresh cookie; parallel 401 responses share a single refresh because the backend rotates the refresh token.
- **Reload by topic.** After a write, `Changes.notify('contacts' | 'meetings')` bumps a version signal that the affected resources depend on. Meeting writes notify both, because meetings move each contact's "last met" and "catch up" dates.
- **The user's today is sent to the API** for the overview, so "today", "overdue" and birthdays match the user's calendar day, not the server's.
- **Calendar dates are UTC midnight** and are formatted in UTC.
- Dialogs are loaded lazily, which keeps the initial bundle under 500 kB.

## Deployment

The `Dockerfile` builds the same-origin variant (API under `/api`) and serves it with nginx, which also proxies `/api` to the backend. It is started by the backend's `docker-compose.prod.yaml`.
