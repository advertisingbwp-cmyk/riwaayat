# Current release: Firebase Spark only

Use [RELEASE_AUDIT.md](RELEASE_AUDIT.md) for the current release procedure. Deploy the reviewed Firestore rules to the confirmed Firebase project before merging the frontend release. Do not deploy the legacy Functions/Storage instructions below: they describe the superseded backend.

```
npx firebase deploy --only firestore:rules --project <confirmed-project-id>
```

The optional guestbook composite index is in `firestore.indexes.json`. Review and deploy it separately with `--only firestore:indexes` if needed. App Check must be registered for the production origin and enforced for Firestore in Firebase Console; code cannot enable that console setting.

Contact opens the visitor's email app. Deletion runs in the signed-in browser and must remain open until completion. A failed deletion can be retried. Passcode invitation guestbook notes stay host-only. Existing invitations need to be republished to gain per-photo encryption and the new guest-submission capability.

---

## Historical backend notes (not for this release)

# New-project staging setup

Status: configuration prepared locally; no cloud project, secret, billing setting or deployment has been changed. The existing website and root deployment config remain unchanged.

## Details still required

- Received: new Firebase project `riwaayat-54e43` and its web app configuration, saved in ignored `.env.staging.local`. Cloud service provisioning and access remain unverified.
- Staging/final web domain and chosen Firebase service locations. Current callable region is `us-central1`; review before provisioning data locations.
- Verified email sending domain/from-address. Enquiries go to the approved recipient `plexudo@gmail.com`.
- Business/operator identity, country and retention decisions before public launch.

## 1. Firebase

Create or select the confirmed new project in Firebase Console. Enable Email/Password and Google authentication, Firestore, Storage, App Check with reCAPTCHA Enterprise, and the services required by Functions and Scheduler. Confirm the required billing plan and budgets with the account owner before enabling paid services. Add the exact staging domain to Auth and App Check configuration.

Copy `deploy/staging.env.example` to `.env.staging.local` and fill it from that project's web app settings. Restart local processes after editing environment files. `.env.staging.local` is ignored by Git. It overrides local emulator values for staging mode. Service-account credentials and the Resend secret do not belong in any `VITE_` variable.

Run from the app root (`rebuild/` in the original local workspace, or the root of the standalone repository):

```powershell
npm run check:staging
npm run build:staging
```

The check validates format and project consistency only. It cannot verify that a web API key belongs to the project or that cloud services are operational.

## 2. Server email and backend deployment

In `functions/.env.riwaayat-54e43`, set `CONTACT_TO=plexudo@gmail.com` and `CONTACT_FROM` to an address on your verified sending domain. Store the Resend credential interactively with Firebase Secret Manager, not in a chat or checked-in file:

```powershell
npx firebase functions:secrets:set RESEND_API_KEY --project riwaayat-54e43
```

After reviewing the exact new target and provider configuration, deploy from the app root using an explicit project argument:

```powershell
npx firebase deploy --only firestore,storage,functions --project riwaayat-54e43
```

No default Firebase alias has been installed, so the old project is not silently selected by these instructions. The frontend build guard does not protect manual Firebase CLI commands: always inspect the explicit backend target. Review Storage-to-Firestore rule permissions, deployed TTL policies, Scheduler job and function permissions. Confirm Node 22 deployment succeeds.

For authenticated browser photo downloads, configure bucket CORS for the exact staging/final origins with GET access, using the Firebase/Cloud Storage instructions below. Do not use a wildcard origin just to silence a CORS error.

## 3. Separate Vercel project

Create a new Vercel project for the rebuild; keep the existing production project unchanged. Set **Root Directory: `./`** for the standalone `advertisingbwp-cmyk/riwaayat` repository. The included `vercel.json` uses `npm run build:staging`, outputs `dist`, and rewrites known application routes. Assets and `/googlef25910401568c702.html` retain their real paths.

Set the staging variables in the new project's environment before building. Keep the preview behind Vercel deployment protection where available until live registration is ready. The current HTML and response headers explicitly disable search indexing; noindex is not an access control. Review protection with Firebase sign-in redirects during staging checks.

## 4. Required live staging checks

- Email verification/reset and Google sign-in on the actual domain.
- App Check acceptance for valid clients and rejection for missing/invalid tokens.
- Cross-account denial for invitation data, replies and photos.
- Publish/passcode, RSVP, moderation, private CSV export and photo CORS.
- Contact provider acceptance and actual delivery to the approved recipient, using an explicitly authorised test message.
- Permanent deletion on disposable staging fixtures, including Scheduler execution, retry behavior and shared-photo preservation.
- Direct page refresh on account, editor, guest invitation and policy routes.
- Google verification file returns its exact text from the intended domain root.

Only after business/policy details and these checks are complete should public registration, indexing and the production domain switch be enabled. Search Console verification itself remains a separate live action.

## Official references

- [Vercel Vite deployment and SPA routing](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel routing configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Firebase environment variables and secrets](https://firebase.google.com/docs/functions/config-env)
- [Firebase browser downloads and CORS](https://firebase.google.com/docs/storage/web/download-files)
