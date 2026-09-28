# Firebase backend setup — Step 4

## Local testing

Prerequisites: Node 22 (Functions deployment runtime) and Java 21+ (Firestore emulator). Development in this session used Node 24; verify Node 22 before deploying.

```powershell
cd rebuild
npm ci
npm --prefix functions ci
npm test
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
npm run test:security
```

`test:security` starts only the `demo-riwaayat` project, runs Firestore/Storage rules plus callable integration tests, and stops the emulators. It never selects the old live project. A portable Microsoft JDK can be used by setting JAVA_HOME and PATH for the current terminal only.

To use the account screen locally:

```powershell
Copy-Item .env.example .env.local
npm run emulators
# In a second terminal:
npm run seed:demo
npm run dev -- --port 5173
```

Open `/account`. Choose **Open sample workspace** after seeding, or use sample email addresses and passwords. The sample sign-in button exists only in emulator mode. Verification/reset links appear in the Auth emulator output; no emails are sent. Google popup is emulated locally. Emulator records are temporary unless explicitly exported; this is the official local test backend, not production persistence. Remove `.env.local` or replace its values before production setup. Restart Vite after changing environment variables.

## Data and authorization

- Verified Firebase identities are required to read/write draft data or photos.
- Private events: `owners/{uid}/events/{id}`. Photos are a subcollection; Storage paths have the same owner/event prefix.
- Firestore and Storage deny direct client writes. Callable functions derive the owner from the verified Firebase token, validate inputs and use the Admin SDK for writes.
- Draft creation is idempotent by request UUID. Conflicting retries are rejected. Drafts have `content: null` until the shared invitation content is supplied by the next editor milestone; sample guest data is never copied into customer records.
- Uploads are decoded by Sharp, restricted to still JPEG/PNG/WebP under 4 MB and 20 million pixels, rotated/resized to at most 2400px and re-encoded to WebP without source metadata. SVG and arbitrary bytes are rejected.
- Object writes use a generation precondition; retry UUID and content digest prevent duplicates or conflicting retries. A failed final metadata write leaves a processing record that the same upload can finish on retry.
- Each draft has a 30-photo limit. Server transactions enforce per-user limits of 10 draft creates/minute and 10 new uploads/minute. These are baseline limits; stronger total account quotas, cleanup/retention and operational monitoring remain release work.
- Read photos with authenticated `getBlob`, then a temporary browser object URL. No public download-token URLs are created or stored. Production Storage needs CORS for the actual frontend origin.
- Cloud Functions require App Check outside the emulator. Browser uses reCAPTCHA Enterprise App Check. This does not replace Firebase authentication/ownership checks.
- RSVP and guestbook endpoints are implemented with guest-session checks. Unmatched paths are denied. Archive is reversible; permanent deletion is implemented below. Retention-based cleanup remains pending.

## Production connection (not performed)

1. Create/confirm a NEW Firebase project, as explicitly requested. Do not reuse the old project or keys. Keep the local replacement isolated until live setup is authorized.
2. Register a web app, enable email/password and Google Auth, and configure authorized frontend domains. Configure password policy and email-enumeration protection.
3. Provision Firestore, Storage and Functions; confirm billing, regions and budgets.
4. Put the web app config into local environment variables shown in `.env.example`, set emulator mode false and add the App Check site key. Never put service-account keys in VITE variables.
5. Register the web origin with reCAPTCHA Enterprise/App Check, configure enforcement and Storage CORS, and deploy the reviewed rules/functions to the intended project. These live actions were not performed during this milestone.
6. Validate email verification/reset delivery, Google sign-in, App Check and cross-user denial against a staging project. Emulators do not prove provider configuration or real email delivery.
7. Finish business identity, privacy/retention details and Terms before opening public registration. The current screen is explicitly a development preview.

Official references: [Firebase rules](https://firebase.google.com/docs/rules/basics), [Storage authorization](https://firebase.google.com/docs/reference/security/storage), [emulator tests](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

## Step 5 — editor and publishing

Owner calls: `saveDraft`, `publishInvitation`, `unpublishInvitation`, `duplicateInvitation`, `archiveInvitation`, `restoreInvitation`.

- Saves validate the full content schema and every selected ready photo. Optimistic revision checks reject stale edits; retry keys prevent duplicate saves/copies. Frontend keeps unsaved input on failure and warns before navigation.
- Publishing creates a server-only snapshot at `published/{eventId}`. Saving another draft revision does not modify that snapshot. Republish deliberately updates guests' version.
- Guest access is separate from draft/published state: anyone with the link, or passcode protected. Passcodes are salted and hashed with scrypt, never returned to the browser, copied into share links or written into public documents.
- `getInvitation` performs server checks and returns only approved invitation content plus an opaque session token. The locked response has no names, photos, hashes or owner identity.
- `getInvitationPhoto` checks token hash, event scope, publication revision, expiration and selected-photo membership on every request. Photos are returned as WebP bytes and rendered from temporary blob URLs; no public Storage token URLs or permanent signed URLs are used.
- Guest tokens expire after 30 minutes. Republishing, unpublishing or archiving prevents old tokens from fetching more photos. Previously downloaded content cannot be remotely withdrawn from a guest's device.
- Guest opening attempts are limited per hashed request IP to 20/minute; photo fetches to 180/minute. Functions retain production App Check enforcement. Confirm real proxy IP handling and abuse protections in staging.
- `firestore.indexes.json` declares TTL for `guestSessions.expiresAt` and `limits.expiresAt`. Deploy and verify those policies in the new project. Logical access expiration is checked independently of eventual TTL cleanup.
- Duplicate creates an owner-only private draft and copies photo metadata; media objects are shared within that owner's library. Account-level object cleanup must respect all references.
- Archive unpublishes and keeps a recoverable owner record. Restore returns it to private draft state. Permanent deletion is available separately through `/data-controls`.
- `/edit/{id}` is the owner editor, `/draft/{id}` the saved owner preview, and `/invite/{id}` the server-authorized guest view. Deployment requires an SPA rewrite for these routes.
- Local URLs work only on this computer. Cross-device sharing, real App Check, expiry under production clock, CORS and Node 22 deployment need staging checks.

References: [callable functions](https://firebase.google.com/docs/functions/callable), [App Check enforcement](https://firebase.google.com/docs/app-check/cloud-functions).

Contact recipient confirmed by user: `plexudo@gmail.com`. Verified sending domain/from-address and server-only email service credentials are still required. No live email was sent.

## Step 6 — submissions, moderation and email

- `submitRSVP` validates session scope/expiry and current publication inside the write transaction. It validates attendance/party/ceremony values, stores only under the owner event, and updates totals once per request UUID.
- `submitGuestbook` requires explicit display consent and always creates `pending` entries. `moderateGuestbook` derives the host from verified auth; `getGuestbook` returns up to 50 approved display-name/message pairs only to authorized invitation guests.
- `setGuestSettings` changes RSVP and guestbook submission availability independently of publication. Server checks take effect immediately; already-loaded guest forms may receive a closed-form error and retain their input.
- Limits: 12 RSVP attempts, 8 guestbook attempts, 5 contact attempts per hashed request IP/minute; event limits are 2,000 replies and 500 guestbook entries. These baseline limits need production traffic review. A retry key prevents transport duplicates; it does not prove a guest's identity or prevent intentional repeat submissions under new keys.
- CSV quotes every cell, escapes quotes and prefixes potential spreadsheet formulas. Keep exported files private. Guest replies and notes never appear in public guestbook output.
- Contact recipient is `plexudo@gmail.com`. `functions/.env.example` records `CONTACT_TO` and a still-empty `CONTACT_FROM`. Configure a verified sender/domain and bind the `RESEND_API_KEY` Firebase secret for production. No client may choose the recipient or sender.
- Emulator contact requests are stored as `local-only`, without any external email API call. Production refuses unconfigured delivery and stores requests privately before sending. The plain-text email adapter uses the same idempotency key on retries and accepts only a provider receipt. “Accepted” is not confirmed inbox delivery.
- Provider idempotency has a finite window: pending contact requests older than 23 hours refuse automatic resending to avoid uncertain duplicates. Operations must review unresolved delivery before resending. No scheduled queue retry or delivery webhook is configured yet.
- Contact bodies, RSVPs and guestbook records require agreed retention/deletion behavior before launch; no retention promises have been made. Session/counter TTL setup is separate.
- Tests use synthetic local records and a mocked email transport. There has been no live email to the configured recipient.

Email API references: [Resend idempotency](https://resend.com/changelog/idempotency-keys), [official API schema](https://github.com/resend/resend-openapi/blob/main/resend.yaml).
# Permanent deletion

`/data-controls` calls `requestDeletion` after typed confirmation and a verified sign-in within five minutes. Request IDs are retry-safe; `getDeletionStatus` exposes only the caller's latest job. A pending deletion locks workspace writes and new owner/guest reads. The worker waits two minutes so earlier 60-second callables can finish, then removes selected event documents and subcollections, publications, scoped guest sessions and unused objects. Photos referenced by surviving invitations are retained. Account cleanup also removes authentication, leaving a minimal closed-account marker to block stale tokens.

Production `cleanupDeletions` is scheduled every five minutes, with a ten-minute per-job lease and a five-minute function timeout. Partial failures keep the owner lock; later runs retry. Deploy and verify Cloud Scheduler, function permissions, Storage-to-Firestore rule access, and operational error monitoring before launch. The runtime remains Node 22 in deployment configuration; local checks use the host runtime.

For local previews, run `npm run deletions:local` alongside the emulators. This worker is hard-coded to `demo-riwaayat` and localhost ports. Stop it before running deletion integration tests: tests explicitly control worker leases and deliberately inject failures. The scheduler itself is not simulated by the Firebase emulator suite.

This removes active host invitation data, not independent contact enquiries, delivered provider emails, downloaded exports or backups. Guest-only removal still uses the reviewed support-request route. Retention for minimal job receipts, closed-account markers and deleted-ID tombstones needs a business decision. Do not claim full erasure or a response deadline until those processes are implemented and checked.
