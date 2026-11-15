# Food Whitelist

A private food preference notebook. Record foods and ingredients, mark them as liked or disliked, and keep useful notes. Responsive Polish interface for desktop and mobile, with English project documentation.

## Features

- Create, edit and delete food preferences.
- Categories, accent-insensitive search, filters and sorting.
- Email-code sign-in through Neon Auth.
- PostgreSQL persistence with access restricted to one approved owner.
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

See [setup and deployment](docs/SETUP.md) for database migrations, owner approval and GitHub Pages configuration.

## Data privacy

The source and website assets are public. Notebook entries are stored separately in PostgreSQL. Row Level Security and a private single-owner allowlist enforce access independently of the interface. Creating an account does not grant notebook access.

Only public Neon Auth and Data API addresses are included in `.env.production` and the browser bundle. Never commit database passwords, `DATABASE_URL`, administrative keys, real records or exports. Cloud failures do not silently switch to local storage. Local preview entries are not automatically migrated to Neon.

JSON exports contain private entries and should be stored privately. They are not a backup of accounts, infrastructure or the whole database.

## Technology

React, TypeScript, Vite, Neon Auth, Neon Data API, PostgreSQL, GitHub Actions and GitHub Pages. The Neon SDK is pinned to `0.9.0-beta`; changes to it require authentication and authorization checks.

The data access layer is separate from the UI. Future modules can use their own tables while sharing authentication and common components.
