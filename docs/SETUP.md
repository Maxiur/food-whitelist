# Setup and deployment

## Neon

Use a dedicated Neon project. This project uses PostgreSQL 17 in Frankfurt (aws-eu-central-1), on the Free plan.

1. Enable Neon Auth (Better Auth) and Data API for the same database, neondb.
2. Use Neon Auth as the Data API identity provider. Expose only the public schema, never app_private or neon_auth. Disable automatic grants to all tables. Set the API row limit to at least 500 (this deployment uses 1000).
3. Apply [001_food_preferences.sql](../database/001_food_preferences.sql), then [003_ingredient_categories.sql](../database/003_ingredient_categories.sql) as the database owner. Then apply `004_shared_notebook.sql` and `006_verified_email_access.sql`. Scripts `002` and `005` are manual approval examples, not automatic migrations. Do not rerun migration `001` after later migrations: it restores the original single-owner policies.
4. Trust the frontend origin in Neon Auth: https://maxiur.github.io. Local development uses http://127.0.0.1:5173. Match CORS origins if restricting Data API CORS.

The migration creates a private allowlist and a food_preferences table with RLS. The allowlist is empty initially. Request identity comes from the verified JWT claims installed by PostgREST for each transaction. Missing claims deny access. No SQL or claims-setting endpoint is exposed.

## Automatic access after verified sign-in

Apply `006_verified_email_access.sql` after migrations `001`, `003` and `004`.
Before users sign in, privately configure the exact owner email using
`007_approve_email.example.sql`. Configure the optional second email with the
`member` role. Never commit populated scripts or real email addresses.

Users enter their own email and one-time code. A verified account matching the
private allowlist gets access automatically; no chat confirmation or manual
user-ID lookup is required. Unapproved addresses cannot access notebook data.
Email identity is read from the managed Neon Auth user table, not from an email
submitted by the browser or an untrusted JWT email claim. The browser cannot
read or modify the allowlist. There is no first-sign-up-wins bootstrap.

Both approved accounts share create, edit and delete access. Existing explicit
owner/member ID bindings from scripts `002` and `005` remain supported; an
explicit owner binding takes priority over email-based discovery. Do not change
the owner's identity without reviewing ownership of stored entries. If an auth
account is deleted and recreated with a new ID, old entries are not transferred
automatically. Self-service invitations are not implemented yet.

Refresh to see changes from another device; the app also refreshes when the
window regains focus. Shared Neon email delivery is used for initial setup;
consult the [Neon production checklist](https://neon.com/docs/auth/production-checklist)
before relying on production email delivery.

## Public configuration

The email-code form keeps the pending email address and request timestamp in
tab-scoped session storage, so returning from an email app or reloading the page
does not reset the code-entry step. UI recovery expires after 15 minutes; OTP
validity remains controlled by Neon Auth. The OTP itself is never persisted.
Successful sign-in or changing the email clears the pending record. Background
session refreshes preserve the mounted login form.

The two public HTTPS service URLs are tracked in .env.production. Vite includes them in the browser bundle. .env.local is ignored. Neither file should contain a database password, privileged key or PostgreSQL connection string.

For another deployment, replace both addresses with the URLs from that Neon project. To connect local development, copy .env.production to .env.local and restart Vite. Without configuration, a development-only local preview is available. Production never falls back to demo mode.

## GitHub Pages

Repository: [Maxiur/food-whitelist](https://github.com/Maxiur/food-whitelist).

1. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Push to main or run **Test and deploy GitHub Pages** in Actions.
3. Read the deployment result for the published URL. The expected standard URL is https://maxiur.github.io/food-whitelist/.

The workflow installs locked dependencies, runs tests, builds, and uploads only dist. Public URLs come from .env.production; optional nonempty Actions variables VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL override them. Invalid or absent URLs block deployment. An endpoint change needs a new build.

## Verification

Run npm test and npm run build. On an isolated Neon test branch, apply the migration and execute [verify_privacy.sql](../database/verify_privacy.sql), followed by [verify_email_access.sql](../database/verify_email_access.sql) on an unconfigured test branch. Stop at the first error. The script uses synthetic identities, verifies owner and collaborator CRUD, rejects stranger and anonymous access, protects the allowlist, and rolls back its changes.

SQL tests do not verify actual JWT transport or email delivery. Separately test first sign-in, sign-out, session restoration, owner CRUD through the API, another account, anonymous requests and a second device. These checks require the owner to enter their email code. Never treat a successful build as proof that authentication works.

## Exports and maintenance

Apply `008_multiple_categories.sql` once after the existing migrations, then
refresh the Data API schema cache before deploying the matching frontend.
It backfills each entry's categories from the legacy category, preserving edit
timestamps. The legacy field remains the first category for older clients.
Category validation and column grants apply to both formats.

Entry drafts use session storage scoped to the signed-in account and entry ID.
They are private to that browser tab and are cleared after a successful save or
explicit discard. They are not a cloud backup. Password settings are available
through the account gear icon, including on the mobile header.

Refresh before exporting to include changes from another device. Exports contain the loaded entries, not the full database or authentication configuration. Keep them outside the public repository.

Neon can suspend idle compute and resume it on demand while retaining storage. Free-plan usage limits still apply. Check [current plans](https://neon.com/docs/introduction/plans) and [scale to zero](https://neon.com/docs/introduction/scale-to-zero).

Apply `009_food_context.sql` once after `008_multiple_categories.sql`, first on an isolated test branch. Run `verify_food_context.sql` and the existing privacy checks, then apply it to production and refresh the Data API schema cache before deploying the new frontend. It adds `kind` and `tags` with database constraints and column-level write grants for authenticated users; existing RLS policies remain in force. Existing entries retain their edit timestamps and default to `unspecified` with no tags. Older clients can continue writing the original fields.

The settings panel contains account details, password setup/reset and a full JSON export. Export format version 2 includes entry types, tags and optional pin state.

Apply `010_notebook_actions.sql` once after `009_food_context.sql`. Test `verify_notebook_actions.sql`, `verify_privacy.sql` and `verify_email_access.sql` on an isolated, unconfigured branch before applying the migration to production. Refresh the Data API schema cache before publishing the new frontend.

Pins use a separate column update, so toggling a pin cannot overwrite notes or categories. Deletion sets a server-controlled timestamp. SELECT and UPDATE policies hide deleted rows; narrow RPCs enforce notebook ownership when deleting or restoring. The UI offers undo for 15 seconds while the server allows 60 seconds for request latency. Closing/reloading the page dismisses its undo notices. Soft-deleted rows remain in PostgreSQL until an explicit maintenance purge; they are excluded from normal reads and exports. They are not a user-visible trash or a backup. Any purge should only target expired soft-deleted rows after the retention period chosen by the owner.

The owner can now manage the single collaborator email in Settings. Invitations reuse the private approved-email allowlist: no public signup can grant access, and the invited address must be verified in managed Auth. The owner manually shares the ordinary site URL; it contains no credential and is not an access grant by itself. The app does not send an invitation email. Revocation removes future data access even for an existing session, but cannot erase records already viewed or exported. Inviting, reading invitation details and revoking are checked on the server, not only in the UI. A concurrent invitation cannot silently replace an existing one. Legacy user-ID collaborators remain supported and are explicitly identified as manually configured.

Add future modules through separate migrations and access policies. Do not widen anonymous access or expose private schemas. Repeat authorization tests after schema or SDK changes.
