# Remly Frontend

Angular client for Remly, a contacts app that remembers when you last saw someone and reminds you who you haven't seen in a while.

Live: [remly.space](https://remly.space) | Backend: [Remly-Backend](https://github.com/aleksa0206/Remly-Backend)

## Screens

- Overview: planned meetings for the next two weeks, who is due for a catch-up, upcoming birthdays
- Contacts: search, filters (favourites, archived, relationship) and sorting
- Contact page: details, keep-in-touch interval, notes and meeting history
- Meetings: log past meetings or plan new ones with one or more people
- Account: profile and 2FA

It's a PWA, so it can be installed on a phone.

## Stack

Angular 22 (standalone components, signals, `rxResource`), Angular CDK, SCSS, Vitest, nginx, Docker.

No UI library and no NgRx. Styles come from `src/styles/_tokens.scss` (shared with HomeWise and StaffAway), and filters/page state live in the URL.

## Running locally

```bash
npm install
npm start          # http://localhost:4200, API on http://localhost:4000
npm test
npm run build
```

Set `FRONTEND_URL=http://localhost:4200` in the backend `.env`. API URL is in `src/environments/`.

## Structure

```
src/app/
  core/       API services, auth (session, interceptor, guards)
  shared/     UI components, date helpers, create/edit dialogs
  layout/     app shell, auth layout, 403/404
  features/   overview, contacts, meetings, account, auth
src/styles/   tokens, mixins, base styles
```

## Notes

- The access token is kept only in memory. On reload the session comes back through the refresh cookie, and parallel 401s share one refresh call because the backend rotates the refresh token.
- After saving something the app bumps a version signal for that area (`contacts` or `meetings`) and the pages that depend on it reload.
- The overview sends the user's local date to the API, so "today" and "overdue" match the user's day and not the server's.

## Deployment

The `Dockerfile` builds the app and serves it with nginx, which also proxies `/api` to the backend. It's started from the backend's `docker-compose.prod.yaml`.
