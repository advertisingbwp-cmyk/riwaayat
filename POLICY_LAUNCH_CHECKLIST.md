# Policy and data request launch checklist

Local draft pages: `/privacy`, `/terms`, `/data-request`. The request page opens the existing contact form with a data request subject. Submission uses existing validation, rate limits and delivery acknowledgement; it does not erase records. Emulator submissions stay local. Live email remains unconfigured.

## Required business decisions

- Confirm legal operator name, country/jurisdiction and service markets.
- Confirm whether the support recipient, plexudo@gmail.com, also handles privacy requests.
- Approve retention periods for accounts, invitations, photos, RSVP details, guestbook entries, contact records and security logs.
- Confirm production hosting, providers, regions, backup retention and applicable legal obligations before finalising policies.
- Define commercial terms only if payments are introduced.

## Removal procedure to implement and verify before launch

1. Record the request without collecting passwords, passcodes or unnecessary identity documents.
2. Verify the requester and scope: an account owner must not be confused with a guest asking to remove their own reply.
3. Review which records are affected, any required retention, and shared photo references across duplicated invitations.
4. Revoke relevant publication and guest access, then remove authorised records and media with retry-safe server operations. Include replies, moderation entries, authentication records for whole-account requests, and contact/provider records where applicable.
5. Verify removal and record a minimal completion receipt. Explain any retained records and backup expiry. Do not claim removal from files previously exported by hosts or guests.

Host self-service removal is implemented at `/data-controls` for active invitation/account data. It uses `DELETE` confirmation, verified ownership, sign-in within five minutes, an owner lock and a scheduled worker. The worker preserves shared media and retries partial failures. Account deletion also removes Firebase Auth sign-in. Archive and unpublish are still not deletion.

Guest-specific removal, independent contact/provider records, backup handling and retention-based automatic cleanup remain pending. Minimal job receipts, closed-account markers and deleted invitation IDs currently remain for safe retries; confirm their retention policy before launch. Final policies must reflect these limits.

Reference: [ICO erasure guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/) was reviewed for identity and backup considerations; UK law applicability has not been established for this business.

Validation: TypeScript and production build passed. Full emulator suite: 43 tests passed, including ownership, recent authentication, failure recovery, shared photos, account removal, duplicate worker exclusion and matching-ID isolation. Browser navigation from Privacy to Data requests to the contact form verified. Data controls: no horizontal overflow at 320/390/768/1440px; typed-confirmation gating checked without submitting removal of the sample invitation. Existing Firebase chunk size warning remains. Full responsive checks for the earlier legal pages remain pending. No live email or live deletion was performed.
