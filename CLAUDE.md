# Monopoly bank terminal

A digital bank for a home Monopoly game. One Android phone is the bank. Players tap NFC cards
on it; each of the 28 deeds has an NFC sticker. Deadline that matters: family game on Thanksgiving.

## Hard constraints
- **Single file, no build step.** Everything is in `index.html` (HTML, CSS, JS). GitHub Pages serves
  the repo root as is. Don't introduce a bundler, framework or npm runtime dependency.
- **Web NFC only works in Chrome on Android over HTTPS.** Desktop browsers have no NFC; every tap
  step also has an on-screen list, and those lists must keep working (see `tests/no-nfc.test.js`).
- **Offline.** `sw.js` caches the app (network first, cache fallback). Bump `CACHE` in `sw.js`
  (`bank-v5` -> `bank-v6`...) whenever you change shipped files, so installed copies update.
  New shipped files must be added to `SHELL` in `sw.js`.
- **The bank never writes to tags.** A tag's factory serial number is its identity. Player cards may
  carry one NDEF text record written by the owner in NFC Tools, `token:<name>` (lowercase, dashes),
  e.g. `token:top-hat`. The bank only reads it and shows the token next to the player's name.
- **Saved game** lives in `localStorage` under `monopoly-bank`. Keep the shape compatible
  (`players[{id,name,color,token?}]`, `deeds{serial: propertyIndex}`, `ledger[]`, `open`), or the
  owner loses enrolled cards and registered deed stickers. Add fields; don't rename them.

## How the code is laid out (index.html)
- Views are `<section class="view" data-view="...">`: start (shown on launch), setup (Players tab), name (naming a new card),
  deedsetup, idle (Bank tab), player, deed, amount, dice, choose, property, ledger, standings,
  settings (Settings tab).
  `show(name)` switches views.
- `state` holds players, deeds, ledger. **Everything else is derived from the ledger** (`W()`):
  balances, owners, houses, mortgages. `post(from, to, amount, note, fx)` adds a ledger entry.
  Undo pops the last entry. Never mutate balances directly.
- `PROPERTIES` is the board (prices, rents, colour groups). `START_BALANCE` is 1500.
- NFC: `startScanning()`, `handleTap(serial, token)`, and `onTap`, which each view sets to decide
  what a tap means. `tokenFromMessage`, `tokenLabel`, `displayName`, `TOKEN_ICONS` handle tokens.
- Rules implemented: colour-set rent doubling, houses/hotels with even building and a 32/12 limit,
  railroads by count, utilities 4x/10x the dice, mortgages with 10% interest.
- Start screen: Continue Game (only if `state.open` or the ledger has entries), New Game (keeps
  players and deed stickers; confirms before ending a game in progress), and a Settings button.
- Players tab: Enroll a Card, Register Deed Stickers (shortcut, hidden once all 28 are registered),
  Open the Bank, Standings, Main Menu.
- Settings tab: Theme (three looks), Setup (Register Deed Stickers), Game (Main Menu,
  Bank Collapse, which wipes everything after a confirm + typing COLLAPSE).
- The tab bar only shows once the bank is open; before that, screens have their own back buttons.
- Headings, button labels and screen titles are Title Case; hints, sub-labels, toasts and ledger
  notes stay sentence case.

## Look and feel
Three looks over one modern layout (rounded cards, a balance "hero" card, icon tiles), picked in the
Settings tab: **A · Midnight** (near-black, mint; the default), **B · Daylight** (warm white, red),
**C · Indigo Night** (indigo, violet, gold). Each look is only a set of CSS variables on
`:root[data-look="a|b|c"]` (`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--pos`, `--neg`,
`--hero`...); style new things with those variables, never hard-coded colours. The choice is stored
per phone under `localStorage['monopoly-bank-look']`, separate from the saved game.
Fonts: Inter, Plus Jakarta Sans, Space Grotesk from Google Fonts (cached for offline by `sw.js`).
It's used one-handed on a phone at a game table: big tap targets, readable from across the table.

## Tests
```
npm install
npm test
```
Four jsdom suites with a fake `NDEFReader`: `nfc-flow` (full game by taps), `no-nfc` (list-only
path), `collapse` (Bank Collapse), `token` (token records). Run them after every change.

## The owner's later ideas (not built)
- Token graphics printed on the matte cards.
- The bank on its own hardware, with each player using a companion app on their phone.
  Cards would stay identity-only; balances would live on the bank.
- House rules: Free Parking jackpot, an auction screen, automatic bankruptcy settlement.
