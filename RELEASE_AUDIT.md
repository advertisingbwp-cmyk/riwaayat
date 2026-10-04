# Riwaayat production audit and release gate

Audited source: `fb51eaf` on `codex/initial-rebuild`, 4 October 2026.

## Confirmed findings and changes

| Finding | Resolution |
|---|---|
| Unpublished invitations and photos remained publicly readable | Rules require published status for guest reads; private owners retain access. Public event enumeration is denied. |
| Public-to-passcode publishing left public photo documents behind | Atomic publish replaces selected photos with ciphertext and deletes unselected public photos. Rules deny plaintext-photo reads for passcode events. |
| All encrypted photos were packed into one Firestore document | Encrypt content separately and each selected photo in its own bounded document. |
| Owner status could say published before public writes succeeded | Publish/unpublish use atomic transactions and stale-revision checks; failures do not report success. |
| Duplicate invitation lost photographs and copied publication metadata | Duplicate private photos into the new workspace and reset publication state. |
| Closed forms could still receive direct SDK submissions | Rules validate parent status, form settings, schema, server timestamps and private guest capability. |
| Guestbook queried pending entries, causing permission failure | Query only approved public-visibility messages. Passcode messages stay host-only, including after moderation. |
| RSVP ceremony names were absent from dashboard/CSV | Resolve saved ceremony IDs against the owner's invitation schedule. |
| Contact/deletion required unavailable Cloud Functions | Contact prepares a mail draft; deletion uses verified-owner Firestore operations and Firebase Auth in the browser. No email is sent automatically. |
| Trial editor was blocked without Firebase and lost preview changes across tabs | Trial editor works independently, uses same-tab saved preview, and retains per-template changes. Photo upload requires a saved account draft. |
| Image limits were advertised but not enforced; narrow photos were distorted | Enforce 4 MB/20 MP input and 200 KB compressed output; preserve aspect ratio. |
| Blog SSG generated metadata only; article body required JavaScript | Render article and guide-hub bodies at build time; avoid duplicate article schema and invented precise publication timestamps. |
| Crypto tests duplicated implementation instead of importing it | Tests now run the real crypto module. |
| CI omitted required validation dependencies and rules tests | Install legacy validation test dependencies; run Java 21 Firestore emulator suite in CI. |

## Verification

- TypeScript and production build pass; all ten article pages contain static article bodies.
- All 14 unit tests pass: real crypto, CSV safety, configuration checks and legacy input validation.
- All 10 Firestore emulator tests pass, covering ownership, enumeration denial, form closure, private capabilities, public-to-passcode migration, document sizes, unpublishing, duplication, stale revisions and deletion.
- Headless Chromium: ten mobile routes without horizontal overflow, trial names survive editor-to-preview, articles work without JavaScript, no application errors in that session. External requests were blocked for deterministic local checks.

## Release gate — not yet a live release

Firebase CLI has no authenticated account in the execution environment. Local rules verification cannot prove which rules are currently deployed. This PR must not be merged until the reviewed rules are deployed to the confirmed Firebase project. The frontend and rules are a coordinated release; old guestbook submissions do not include the new visibility field. Plan a short coordinated deployment window.

1. Deploy this branch's `firestore.rules` to the confirmed project using an authenticated Firebase CLI. Never infer the project from a Vercel project name.
2. Verify Firestore App Check enforcement, allowed web domains and email/password + Google sign-in settings in Firebase Console.
3. Merge the passing PR and verify Vercel deployment. Republish existing invitations to replace legacy public photos and create private guest capability tokens. Unpublish any sensitive legacy invitation until migrated.
4. Using a disposable account and event, check verification email/sign-in, photo upload, public/private publish, RSVP, moderation, CSV, unpublish and deletion. Do not use or delete a real customer's event as a test.

## Remaining operational limits

- Browser deletion is not a background worker. Keep the page open; interrupted cleanup is not complete until retried successfully. Exported copies, external emails and backups are outside this operation.
- Firestore validation and App Check are not per-IP rate limiting. Monitor Spark quotas and abuse; no unlimited usage claim is made.
- No account session was available to test production authentication or existing customer data. No live message, customer-data mutation or deletion was performed.
- The repo homepage points to `riwaayat-bwp2.vercel.app`, while canonical links and prior project context use `riwaayat-venue.vercel.app`. The venue domain responds publicly; the bwp2 domain redirects to Vercel login protection. Keep the public venue canonicals unless domain assignment is deliberately changed.
- Legal operator identity, jurisdiction and retention decisions in `POLICY_LAUNCH_CHECKLIST.md` remain user/business decisions; this change does not invent them.
