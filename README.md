# Math Minutes

A quiet, encouraging math fluency game for second graders. Built with React, TypeScript, and Vite. No accounts, backend, ads, analytics, external fonts, or runtime network requests.

## Run locally

Use Node.js 22 or later:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm test` for the automated domain tests and `npm run build` to typecheck and create `dist/`.

## Practice

Choose addition or subtraction, answer five untimed warm-up questions, then complete a two-minute round. Enter numbers with your keyboard and press Enter, or use the on-screen keypad. An optional untimed three-number addition challenge follows, with two attempts and a hint. Results include accuracy, earned game time, reward details, and a review of missed facts.

Default rewards: 5 minutes for completing a session, plus the highest applicable accuracy tier (70%: 2, 85%: 4, 95%: 5), 2 for improvement, and 2 for the bonus challenge. Improvement requires at least two more correct answers than the previous round of the same operation, at least 85% accuracy, and no more than a five-percentage-point accuracy decrease. Default limits are 20 minutes and two rewarded sessions per local calendar day. Additional practice remains available. Game time is a record for parents; this app does not control the device.

Adaptive selection targets 60% learning, 25% practicing, and 15% mastered facts, redistributing when a category is unavailable. Unseen facts, errors, slower responses, and related fact families receive additional weight. Each ordered addition and subtraction fact has its own record. Mastery requires at least five consecutive successes, 85% lifetime accuracy, three successful sessions, and successful practice on two different days. Slow correct answers count as successes. Warm-up attempts contribute to mastery; bonus challenges do not.

## Parent space

Answer the simple entry question to see recent scores, accuracy, response times, facts needing practice, and session history. This gate prevents accidental changes and is not secure authentication. Configure the nickname, enabled operations, operand bounds, sound, and every reward amount and limit. Settings save immediately. Export JSON regularly to preserve a backup or move progress between devices; importing replaces the current progress after confirmation. Reset requires confirmation.

Progress uses the versioned `math-minutes-v1` localStorage key. Missing or invalid data starts fresh; blocked/full storage displays a warning. Clearing browser data clears progress. Local date changes reset only daily counters, preserving history and records. No data leaves the device.

## GitHub Pages

This workspace is intended for https://github.com/noynek/math-facts. The deployment workflow detects the actual repository name, so both `/math-facts/` and `/math-minutes/` work. For a new repository:

1. Create an empty GitHub repository named `math-minutes` (or use your existing `math-facts` repository).
2. Commit and push this project:

```sh
git add .
git commit -m "Build Math Minutes"
git remote add origin https://github.com/USERNAME/math-minutes.git
git push -u origin main
```

If `origin` already exists, use that remote rather than adding it again.

3. In GitHub, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
4. Push to `main`, or manually run **Actions → Deploy Math Minutes**.
5. The workflow installs locked dependencies, runs tests, builds with the repository base path, and deploys the `dist` artifact using the official Pages actions.
6. Find the published link in **Settings → Pages** or in the deployment workflow. For the requested repository it is `https://noynek.github.io/math-facts/`; a repository named `math-minutes` publishes at `https://USERNAME.github.io/math-minutes/`.

## Architecture

- `src/math.ts`: fact curriculum, bonus problems, and valid mental math strategies.
- `src/adaptive.ts`: weighted review selection and consecutive-repeat prevention.
- `src/mastery.ts`: fact attempts, response times, dates, sessions, and mastery.
- `src/rewards.ts`: accuracy tiers, improvement, and daily reward caps.
- `src/storage.ts`: schema, validation, local-date resets, and persistence.
- `src/main.tsx`: child flow and parent dashboard.
- `src/core.test.ts`: curriculum, adaptation, mastery, rewards, persistence, and date reset tests.

The timer uses a wall-clock deadline, so backgrounding a tab does not extend the speed round. An unfinished session keeps fact practice records but earns no minutes. Personal records require at least 85% accuracy. Sound is generated quietly on-device and defaults off.

Browser checks run with `npx playwright install chromium` followed by `npm run test:e2e`. They exercise addition and subtraction, timed expiry, warm-up corrections, keypad editing, bonus retries, skipping disabled bonuses, reward totals, review, parent settings, persistence, and desktop/mobile layouts.

For direct access, choose **Bonus practice** on the home screen. This untimed mode offers repeated three-number addition questions, hints, and answer feedback without starting a full session. A correct standalone challenge earns the configured bonus (2 minutes by default), subject to the shared daily minute cap and rewarded-session limit. Each standalone challenge that earns minutes uses one rewarded-session slot; unsuccessful or capped challenges do not consume a slot. Standalone challenges are saved in separate bonus history and do not affect fact mastery or two-minute personal records. The home shortcut follows the parent's bonus-challenge setting.

Bonus problems have separate Hundreds, Tens, and Ones answer boxes, plus optional carry-note boxes above Hundreds and Tens. Entry begins in Ones; tap any box or use left/right arrow keys within a row. The keypad writes into the selected box. Fill Ones and Tens, leaving Hundreds blank when unnecessary, and press Check or Enter when ready. Carry notes are scratch work and do not affect correctness; retrying preserves the working.
