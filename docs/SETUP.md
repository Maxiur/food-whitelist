# Setup and deployment

## Neon

Use a dedicated Neon project. This project uses PostgreSQL 17 in Frankfurt (aws-eu-central-1), on the Free plan.

1. Enable Neon Auth (Better Auth) and Data API for the same database, neondb.
2. Use Neon Auth as the Data API identity provider. Expose only the public schema, never app_private or neon_auth. Disable automatic grants to all tables. Set the API row limit to at least 500 (this deployment uses 1000).
3. Apply [001_food_preferences.sql](../database/001_food_preferences.sql) as the database owner.
4. Trust the frontend origin in Neon Auth: https://maxiur.github.io. Local development uses http://127.0.0.1:5173. Match CORS origins if restricting Data API CORS.

The migration creates a private allowlist and a food_preferences table with RLS. The allowlist is empty initially. Request identity comes from the verified JWT claims installed by PostgREST for each transaction. Missing claims deny access. No SQL or claims-setting endpoint is exposed.

## First sign-in and owner approval

1. Open the application, enter your email, receive the one-time code and enter it yourself.
2. The account remains on the access-pending screen until approved.
3. Find its exact user ID in Neon Auth Users. Confirm its email is verified and belongs to the intended owner.
4. Use [002_set_owner.example.sql](../database/002_set_owner.example.sql) in the SQL Editor, replacing the placeholder in a private copy. Do not commit the populated script.
5. Select **Check access again** in the application.

The bootstrap refuses to replace an existing owner. Additional accounts cannot read or write notebook entries. Shared Neon email delivery is used for initial setup; consult the [Neon production checklist](https://neon.com/docs/auth/production-checklist) before relying on production email delivery.

## Public configuration

The two public HTTPS service URLs are tracked in .env.production. Vite includes them in the browser bundle. .env.local is ignored. Neither file should contain a database password, privileged key or PostgreSQL connection string.

For another deployment, replace both addresses with the URLs from that Neon project. To connect local development, copy .env.production to .env.local and restart Vite. Without configuration, a development-only local preview is available. Production never falls back to demo mode.

## GitHub Pages

Repository: [Maxiur/food-whitelist](https://github.com/Maxiur/food-whitelist).

1. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Push to main or run **Test and deploy GitHub Pages** in Actions.
3. Read the deployment result for the published URL. The expected standard URL is https://maxiur.github.io/food-whitelist/.

The workflow installs locked dependencies, runs tests, builds, and uploads only dist. Public URLs come from .env.production; optional nonempty Actions variables VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL override them. Invalid or absent URLs block deployment. An endpoint change needs a new build.

## Verification

Run npm test and npm run build. On an isolated Neon test branch, apply the migration and execute [verify_privacy.sql](../database/verify_privacy.sql). Stop at the first error. The script uses synthetic identities, verifies owner CRUD, rejects stranger and anonymous access, protects the allowlist, and rolls back its changes.

SQL tests do not verify actual JWT transport or email delivery. Separately test first sign-in, sign-out, session restoration, owner CRUD through the API, another account, anonymous requests and a second device. These checks require the owner to enter their email code. Never treat a successful build as proof that authentication works.

## Exports and maintenance

Refresh before exporting to include changes from another device. Exports contain the loaded entries, not the full database or authentication configuration. Keep them outside the public repository.

Neon can suspend idle compute and resume it on demand while retaining storage. Free-plan usage limits still apply. Check [current plans](https://neon.com/docs/introduction/plans) and [scale to zero](https://neon.com/docs/introduction/scale-to-zero).

Add future modules through separate migrations and access policies. Do not widen anonymous access or expose private schemas. Repeat authorization tests after schema or SDK changes.
