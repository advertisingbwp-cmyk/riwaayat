# Riwaayat — homepage and invitation previews

Independent React + TypeScript + Vite application. The existing server and live deployment are unchanged.

## Staging deployment preparation

See `DEPLOYMENT.md` and `deploy/staging.env.example`. The standalone `advertisingbwp-cmyk/riwaayat` repository contains this app at its root; use Vercel Root Directory `./`. `npm run build:staging` rejects emulator settings, the old Firebase project, mixed project fields and frontend server secrets. `npm run build` remains available for local validation. The current staging preflight intentionally fails until new project details are provided. Twelve local unit tests pass, including four new configuration tests. No cloud deployment has been attempted; indexing remains disabled.

## Data controls

`/data-controls` lets verified hosts queue permanent invitation or account deletion after a recent sign-in and typed `DELETE` confirmation. Cleanup runs in the background, preserves photos shared with surviving invitations, removes private replies and guestbook records, and retries partial failures. Account cleanup removes sign-in after active data cleanup. Contact records, provider emails, exported copies and backups need separate handling; see `POLICY_LAUNCH_CHECKLIST.md`.

Local cleanup: run `npm run deletions:local` alongside Firebase emulators. Stop that worker before integration tests, which run cleanup explicitly. No live project is involved. Full suite: 43 tests passed; focused deletion suite: 7 passed, including completion status after authentication removal. TypeScript/production build passed. Browser confirmation gating and 320/390/768/1440px layouts checked without deleting the sample invitation.

## Run

```powershell
# In this standalone repository, run from its root.
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173/. Build with `npm run build`; inspect the production bundle with `npm run preview`.

## Implemented

- Responsive ivory/plum homepage and mobile navigation.
- A pinned, scroll-driven 3D story: camera approach, floating seal release, folding flap, invitation extraction and a three-design fan reveal.
- Four changing copy chapters, progress indicators, skip link and animation-off/static alternative.
- Natural scrolling (no wheel/touch interception); reverse scrolling reverses the scene. Frame updates run only after scroll/resize events, with observer/listener cleanup and hidden-page handling.
- Reduced-motion preference selects the static finale and removes the long pinned section.
- Three design cards and category filtering, linking to complete invitation routes.
- FAQs, meaningful anchor navigation and explicit notices for unfinished account/legal/contact features.
- Existing repository WebP images reused locally; typography currently requests Google Fonts, with system fallbacks.

## Scope

This is a development preview. The account workspace uses Firebase when configured; the published local invitations support persisted RSVP and moderated guestbook submissions; design samples retain demo forms. The editor and publishing run locally against emulators; live deployment and payments remain unavailable. Terms/Privacy dialogs are project status notices, not final legal policies. `noindex` is intentional until launch preparation. External font requests should be considered when finalising privacy disclosures or replaced with locally hosted licensed fonts.

## Validation — 28 September 2026

- TypeScript check and Vite production build passed.
- Browser widths 320, 390, 768, 1440: document scroll width equals client width; no horizontal overflow.
- Mobile menu opens and closes after following a navigation link.
- Nikah category filter leaves Noor as the matching design.
- Royal Heritage and Noor dialogs show their matching names/date; Escape closes the dialog and returns focus to its trigger.
- Scroll story visually inspected at desktop and 390px mobile: closed envelope, seal release, card extraction and three-card finale.
- Page Down advanced to chapter 2; Page Up returned to chapter 1 with decreasing progress. Keyboard activation of animation-off collapses the long scroll section to the static finale; re-enable restarts the sequence.
- Pure choreography checks passed for phase ordering, endpoint clamping and finite transform values across 101 sampled positions.
- No broken images or browser console errors observed in the tested session.
- Reduced-motion behavior reviewed in source; OS/browser reduced-motion emulation was not available in the current browser tool, so that preference needs a manual device check.
- No production requests or customer data writes performed.

## Step 3 — invitation pages

Routes: `/preview/royal`, `/preview/noor`, `/preview/bloom`. Shared sample data and date formatting live in `src/events.ts`.

- Distinct crimson/gold, emerald/starlight and pastel garden layouts.
- CSS 3D envelope and wax seal; skip/Escape and reduced-motion paths.
- Canvas petals, stars and leaves; pause control, reduced-motion support and hidden-tab suspension.
- Play/Pause, four instrument-inspired synthesized voices and volume; no autoplay, hidden-tab stop and resource cleanup.
- Timezone-aware countdown, story, ceremony schedule and map link. Fictional venues and sample imagery are labelled.
- Canvas scratch reveal plus keyboard-accessible reveal/reset button.
- Four-image gallery with native modal, previous/next, arrow keys, Escape and focus restoration.
- Demo RSVP supports acceptance/decline, party size, meal, ceremonies and a note. The form has no storage or network submission.

### Step 3 checks — 28 September 2026

- TypeScript and production build passed (35 modules).
- All three invitation routes checked at 320, 390, 768 and 1440px; no horizontal overflow.
- Royal seal activation closes the opening and focuses the page heading. Noor/Bloom skip paths checked.
- Keyboard scratch reveal shows the correct hashtag and attire.
- Gallery advances from photograph 1 to 2 and closes with Escape.
- Acceptance and decline demo submissions show the explicit not-sent/not-stored result. Decline hides attendance-only fields.
- Music toggles Play/Pause; particle control toggles Pause/Resume. Audio quality has not been verified by listening.
- Noor and Bloom mobile layouts visually inspected. No console warnings/errors observed.
- Homepage Noor button navigates to the correct full page; direct route refresh works under Vite.
- Physical touch scratching and OS reduced-motion preference require manual device checks before release.
- Production hosting will need an SPA fallback for direct invitation URLs; hosting configuration has not been changed.

## Step 4 — Firebase account and data foundation

- `/account`: email/password and Google sign-in, registration, verification resend/refresh, password reset and sign-out. Production providers and email delivery need staging verification.
- Owner-only draft list, server-confirmed draft creation and validated private image uploads. The draft is a metadata shell; full content editing is the next milestone.
- Server-side validation, ownership derived from authentication, verified-email requirement, production App Check enforcement, transaction rate limits and idempotent requests.
- Firestore/Storage rules deny direct client writes and all non-owner reads. Uploaded photos use authenticated blob reads, without public download tokens.
- Missing configuration shows an unavailable message. The SDK loads only on the account route.
- Local `.env.local` currently selects `demo-riwaayat` emulators. The seeded sample account is for local testing only; no real customer data or live Firebase project is connected.

### Step 4 validation — 28 September 2026

- `npm test`: 3 image/schema validation tests passed.
- `npm run test:security`: 10 Firestore/Storage rules and callable integration tests passed. Includes unverified-user denial, owner field injection rejection, cross-user photo denial, invalid image rejection and idempotent draft/photo writes.
- First emulator function discovery timed out at 10 seconds. Retried with `FUNCTIONS_DISCOVERY_TIMEOUT=60`, then all functions loaded and tests passed.
- Browser: unavailable configuration, sign-up/reset view changes, sample sign-in, private draft creation, photo upload/preview and draft persistence after refresh verified. No console errors observed.
- Account forms and signed-in workspace: 320/390/768/1440px, no horizontal overflow.
- TypeScript + production build passed. Account SDK chunk is approximately 730 KB / 181 KB gzip and is loaded lazily; further splitting can be considered during release performance work.
- Backend npm audit: zero reported vulnerabilities after compatible fixes. Firebase CLI development dependencies still report five moderate advisories; no forced downgrade applied. These tools are not bundled into the website.
- Emulator suite ran on host Node 24; deployed Functions target Node 22. Node 22 staging verification remains a release check.
- Live OAuth, email delivery, Storage CORS and production App Check enforcement are not proven by emulator results.

See [backend setup](BACKEND_SETUP.md) for emulator commands, schema/security notes and production prerequisites.

## Step 5 — editor and local publishing

- `/edit/{id}` edits names, invitation copy, venue/map, local date/time and timezone, story, ceremonies, selected uploaded photographs, hashtag, attire, instrument and four effect switches.
- Server-confirmed save status, unsaved-change warning and revision conflicts. A failed save retains form input.
- `/draft/{id}` renders saved owner content with the same invitation renderer used by the guest route; there are no sample names in customer content.
- Public or passcode publishing creates a separate snapshot. Share/copy link and unpublish controls; WhatsApp is offered only outside emulator mode.
- Owner-only duplicate, reversible archive and restore. Permanent data deletion remains a release/retention task.
- Guest media is protected by short-lived, revision-scoped server sessions. No private content is returned by the passcode gate.
- Real invitations clearly state that RSVP is not open yet. Sample template forms remain explicit demos.

### Step 5 checks

- Final suite: 21 tests passed (18 emulator integration/rules tests plus 3 validation tests). TypeScript and production build passed.

- Editor save, return/reload, saved preview and local public publication checked in the browser with sample content/photo.
- Guest page shows matching names, venue, hashtag and uploaded photo, without sample design labels or empty story/schedule sections.
- Editor widths 320/390/768/1440: no horizontal overflow. No browser console errors observed during tested flows.
- Emulator coverage includes stale-save conflicts, invalid timezone/photo rejection, duplicate retries, passcode denial, unpublished/draft denial, selected-photo restrictions, session invalidation, snapshot isolation, owner-only copies and archive/restore transitions.
- No live deployment or old Firebase project/key was used. The user selected a NEW Firebase setup.
- Real external-device links, production email/OAuth/App Check and full device accessibility checks remain pre-release work.

## Step 6 — guest responses and contact

- Published invitations offer server-persisted RSVPs: accept/decline, party size, valid ceremony choices, optional meal preference and a private note. No guest email or phone is collected.
- `/responses/{id}` is owner-only: reply totals, attendee counts, ceremony totals, filtered list, CSV export and moderation. RSVP records cannot be read by other hosts or guests.
- Guestbook requires separate display-name/message consent. Messages remain pending until host approval; guest reads return only approved display names/messages, never RSVP details.
- Hosts can close RSVP or guestbook submissions immediately. Draft, unpublished, archived, expired-session and invalid-passcode access are rejected at the server.
- Transactional idempotency prevents double-counting on retries. Baseline per-IP rate limits, 2,000 replies/event and 500 guestbook messages/event are enforced.
- `/contact` keeps input on failure and has an explicit local-only inbox mode. Production uses a server-side email adapter with provider idempotency and confirms acceptance only after a provider receipt.
- Contact recipient: **plexudo@gmail.com**, confirmed by user. Verified sender/domain and `RESEND_API_KEY` remain unset. No real email was sent.

### Step 6 checks — 28 September 2026

- Final combined suite: **35 tests passed**, including RSVP persistence/deduplication, private-read denial, guestbook consent/moderation, closure/unpublish/expiration, CSV formula neutralization and mocked email acceptance/failure paths.
- TypeScript and production build passed. Existing Firebase SDK chunk-size warning remains.
- Browser sample RSVP appeared in the host dashboard as 1 accepting party / 2 guests with a private note. Sample guestbook message was pending, then approved by the host.
- Browser CSV download event was not confirmed by the in-app browser. Added an explicit prepared-CSV copy fallback; copied content was verified. Normal browser file download requires a manual check.
- Contact form saved to the emulator inbox with the explicit “No email was sent” receipt.
- Dashboard and contact widths 320/390/768/1440 showed no horizontal overflow. The wide RSVP table scrolls within its panel.
- Emulator logs include expected permission-denied output for denial tests and an Admin SDK metadata lookup warning; all assertions passed. Live delivery, provider credentials, production abuse controls and cross-device release tests remain pending.

Next: Step 7 — final business/policy decisions and legal pages. Public launch still requires the new Firebase project and staging verification.
