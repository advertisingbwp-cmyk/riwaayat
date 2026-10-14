# Couple Quiz Invitation — Product Plan

## Product boundary

**Couple Quiz is a separate invitation template.** It appears in the collection beside Royal Heritage, Noor, Bloom, Sahar and Mehr. It is not an optional section inside those templates.

## Access model

- Anyone with a published Couple Quiz invitation link can open and play it without creating an account.
- The public `/preview/quiz` demo is also playable without an account and does not save answers.
- A host account is required only to customise questions, save, publish, close the quiz, and view or delete results.
- Existing invitation templates remain public to invited guests under their host-selected link or passcode setting and do not show the quiz.

## Host flow

1. Choose **Couple Quiz** from the invitation collection.
2. Personalise the invitation details and its 1–10 quiz questions.
3. Mark one correct answer for each question.
4. Save and publish a public or passcode-protected guest link.
5. Review scores and answers from the host responses screen.

## Guest flow

1. Open the shared invitation link without signing in.
2. Read the invitation and start the quiz.
3. Enter a display name and consent to sharing the name, answers and score with the host.
4. Answer one question at a time.
5. See the final score and optionally share the invitation link.

## Privacy and security

- Public quiz data excludes the correct-answer key.
- Correct answers stay in the owner draft.
- Firestore rules validate the submitted answer set and score against the owner key.
- Guests cannot list or read other guests' attempts.
- Quiz attempts are removed with the invitation or account deletion flow.
- The feature collects no quiz email address or phone number.

## Release checks

- `/preview/quiz` works without authentication on phone and desktop.
- `/edit/try-quiz` shows the Couple Quiz builder; other template editors do not.
- A published Couple Quiz link accepts an anonymous guest attempt.
- Royal, Noor, Bloom, Sahar and Mehr contain no quiz section.
- Host results show ranking, average score, answer review, CSV export and open/close controls only for Couple Quiz invitations.
- Production build and unit tests pass. Firestore emulator security tests require Java.
