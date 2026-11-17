# Food Whitelist

A private food preference notebook. Record foods and ingredients, mark them as liked or disliked, and keep useful notes. Responsive Polish interface for desktop and mobile, with English project documentation.

## Features

- Create, edit and delete food preferences.
- Select multiple categories per entry, including Sweets. Filters match any selected category.
- Independent entry type (ingredient, prepared dish, or unclassified) and up to eight context tags. Existing entries remain unclassified until edited.
- Combine multi-select category, type and tag filters. Selections within a group use OR; different groups use AND. Click a tag on a card to filter by it.
- Account settings keep password management and a full JSON export in one panel, without leaving the notebook or resetting filters.
- Pin entries to the top of the filtered list, independently of the selected sort order. Pins are shared between devices and collaborators.
- Undo each deletion for 15 seconds. Restoration preserves the entry ID, content and pin; deleted rows are hidden from normal reads.
- A compact shuffle control picks a liked prepared dish from the current results and avoids immediately repeating it when alternatives exist.
- The owner can approve one collaborator email and revoke it in Settings. Share the site link manually; invitation emails are not sent automatically. A collaborator must verify the approved email through Neon Auth.
- Tab-scoped drafts survive dialog closure and page reloads. Save or explicitly discard a draft to clear it; drafts are not synced between devices.
- Long notes can be expanded and scrolled; empty notes are omitted.
- Categories, accent-insensitive search, filters and sorting.
- Categories describe food groups independently of preparation or context. A salmon spread can be a prepared dish in FishSeafood and Sauces, with a breakfast tag.
- Email-code sign-in through Neon Auth. Preapproved email addresses get notebook access automatically after verification.
- Optional email/password sign-in. Set or recover a password using a dedicated email reset code, including on an existing passwordless account. Password hashing and credential storage are handled by managed Neon Auth, never by the notebook tables or browser storage.
- PostgreSQL persistence with access restricted to an approved owner and one approved collaborator. Both sign in independently by email code and share all entries.
- JSON export of loaded entries.
- Explicit local preview for development, separate from cloud data.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Copy the public URLs from `.env.production` to a gitignored `.env.local` to connect local development to Neon. Open `http://127.0.0.1:5173/?demo` for an isolated local preview. No sample preferences are seeded.

```sh
npm test
npm run build
```

See [setup and deployment](docs/SETUP.md) for database migrations, private email configuration and GitHub Pages configuration.

## Data privacy

The source and website assets are public. Notebook entries are stored separately in PostgreSQL. Row Level Security and private owner/member allowlists enforce access independently of the interface. Creating an account does not grant notebook access.

Only public Neon Auth and Data API addresses are included in `.env.production` and the browser bundle. Never commit database passwords, `DATABASE_URL`, administrative keys, real records or exports. Cloud failures do not silently switch to local storage. Local preview entries are not automatically migrated to Neon.

JSON exports contain private entries and should be stored privately. They are not a backup of accounts, infrastructure or the whole database.

## Technology

React, TypeScript, Vite, Neon Auth, Neon Data API, PostgreSQL, GitHub Actions and GitHub Pages. The Neon SDK is pinned to `0.9.0-beta`; changes to it require authentication and authorization checks.

The data access layer is separate from the UI. Future modules can use their own tables while sharing authentication and common components.
