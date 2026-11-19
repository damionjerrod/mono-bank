# Monopoly bank terminal

One Android phone runs the bank. Players tap NFC cards on it; deeds carry NFC stickers.
Single file, no build step: `index.html`. The August version is kept as `original-aug-2026.html`.

## Put it online (Web NFC needs HTTPS)
1. Create a GitHub repo, add `index.html` at the root, push.
2. Repo Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<you>.github.io/<repo>/` in **Chrome on Android**. Add it to the home screen if you like.
The game is saved in the phone's browser storage; clearing site data wipes it.

## What it does
- **Players:** enroll cards, register the 28 deed stickers, open the bank, standings, new game.
- **Tap a player card:** Pass GO, pay rent (then tap the deed), collect, pay bank (tax and jail presets),
  pay another player, buy property (price fills in; change it for an auction), my deeds.
- **Tap a deed:** owner, rent due now, the printed rent table, and actions: sell to a player,
  charge rent (tap the payer), add/sell houses and hotels, mortgage / lift mortgage (10%),
  hand the deed over (trade, or back to the bank when someone goes bankrupt).
- Rent is automatic: colour-set doubling, 1–4 houses, hotels, railroads by count, utilities 4×/10× the roll.
- Building follows the rules: full set, no mortgages in the set, even building and selling, 32 houses / 12 hotels.
- Every change is a ledger entry. Balances, owners, houses and mortgages are all computed from the ledger,
  so **Undo** (Ledger tab) reverses anything, deed changes included.
- Every "tap" step also has an on-screen list, so a lost card never stops the game.

## Also
- Installable (PWA) and works offline: `manifest.webmanifest`, `sw.js`, icons.
- **Bank Collapse** on the Players tab wipes everything (confirm, then type COLLAPSE).
- Token cards: write a text record like `token:top-hat` to a card in NFC Tools; the bank shows the token.

## Tests
`npm install && npm test` runs four jsdom suites (nfc-flow, no-nfc, collapse, token).
See CLAUDE.md for how the code is laid out.

## Not built (house rules you can add later)
Free Parking jackpot, a separate auction screen, automatic bankruptcy settlement, sharing balances to other phones.
