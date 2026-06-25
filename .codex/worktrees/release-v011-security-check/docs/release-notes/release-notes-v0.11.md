# World of ClaudeCraft - v0.11.0 Release Notes

**Release:** v0.11.0
**Date:** 2026-06-21
**Previous release:** v0.10.0

v0.11.0 is a security, localization, wallet, performance, and polish release with
**80 commits** since the public v0.10.0 tag. It removes the vulnerable third-party
wallet connector stack, adds a smaller injected Solana wallet-linking path,
introduces `$WOC` holder flair and shareable player cards, completes a major
hardcoded-string localization sweep, improves graphics budgets and telemetry,
and lands several game-feel fixes across movement, audio, market browsing, and
combat.

## Highlights

- **Wallet security cleanup**: the Reown/AppKit wallet SDK stack was removed and
  replaced with a narrow injected Solana wallet flow for challenge signing.
- **Zero moderate-or-higher npm audit findings**: the latest release branch audit
  reports `found 0 vulnerabilities`.
- **$WOC holder flair and player cards**: linked wallets can show exact `$WOC`
  balance, holder-tier badges, shareable player cards, and referral-friendly
  card URLs.
- **Full hardcoded-string localization sweep**: UI, sim, server, admin, and
  generated locale outputs were hardened so player-facing text continues to pass
  release-tier localization gates.
- **In-game language switching**: players can switch language from the Options
  menu without leaving the game.
- **Graphics budgets and telemetry**: adaptive render budgets, low graphics
  profile tuning, telemetry export, and performance reporting tools were added.
- **Market browsing improvements**: search, filters, filtered counts, styled
  filter menus, and pagination make listings beyond the wire cap reachable.
- **Game-feel fixes**: Druid Travel Form and Dash now provide real movement
  speed, hill descent stays grounded, final DoT ticks apply, target portraits are
  sharper, and footstep audio no longer produces a metallic jingle.

## Wallet Security & `$WOC`

- The release removes `@reown/appkit`, `@reown/appkit-adapter-solana`,
  `@solana/web3.js`, and the associated browser polyfill path from the wallet
  client dependency surface.
- Wallet linking now uses injected Solana browser wallets directly. The flow is
  intentionally narrow: detect a provider, connect, sign the server challenge,
  and send the signature back for account linking.
- The wallet UI is enabled by default and can be disabled with
  `VITE_WALLET_DISABLED=1`.
- `$WOC` balance reads now go through the server proxy so RPC keys do not ship to
  the browser.
- Wallet UX was refined around Wallet Standard behavior, late provider injection,
  signature encoding, disconnect/account-change events, and wallet-help text
  alignment.
- Third-party license notices were added for the removed wallet-connect stack so
  the repository keeps the historical licensing trail clear.

## Holder Flair & Player Cards

- `$WOC` holder tiers now appear in inspect/profile surfaces and are backed by a
  shared holder-tier model.
- Shareable player cards were added for holder flair, including server rendering,
  player-card persistence, and card sharing helpers.
- Card image handling was tightened so hosted uploads stay smaller and dev card
  images continue to use the dev origin.
- The player-card layout was polished with the swapped brand mark, holder badge,
  exact balance support, and quality-pass test coverage.
- New server endpoints and database helpers cover wallet links, player cards,
  provider usage, and `$WOC` balance lookups.

## Internationalization

- A broad hardcoded-string sweep localizes player-facing UI, sim, and server text
  across the supported locale set.
- Release-tier localization output was completed and hardened so pending strings
  do not ship in the generated status registry.
- The translation workflow docs and subdirectory agent docs were aligned with the
  current i18n system.
- `Intl.PluralRules` cardinal pluralization was added through `tPlural`, with
  whole-catalog completeness and CLDR plural guard tests.
- The in-game language picker was added under Options > Interface and then
  hardened around re-enable behavior and focus restoration.
- Locale correctness fixes include Nythraxis diacritic repair, stale Druid
  Wolf-Form translations, Korean compass leakage, and additional audit-quality
  fixes across locale files.

## Graphics, Performance & Rendering

- Adaptive graphics budgets and telemetry were added, including render-budget
  tests and reporting utilities.
- The low graphics profile was finalized with capped cadence handling, foliage
  lean adjustments, and preserved high-tier graphics headroom.
- Telemetry ingestion and export were bounded so performance reporting stays
  useful without becoming an unbounded server sink.
- Renderer-focused performance traces replace broader net tracing for the dev
  performance branch.
- Target-frame portraits were polished for fill, HiDPI crispness, and layout
  overlap.
- Unit portrait helpers and painters were added for clearer UI portrait rendering.
- A new Chicken Cow model asset and generation script were added to the media
  asset set.

## Market, UI & Controls

- World Market browsing now supports search so listings beyond the wire cap can
  be found.
- Market filters, filtered counts, styled filter menus, and pagination make the
  browse experience more predictable.
- Market localization gates were satisfied and the catalog locale shape was
  aligned.
- Key Bindings now use a wider horizontal layout.
- HUD chrome localization coverage expanded alongside new UI catalog entries.
- Rest indicators, clocks, coordinates, compass, XP bar, minimap zoom, meters,
  chat timestamps, and cast bars received small polish and localization updates.

## Classes, Movement & Combat Fixes

- Druid Travel Form is now a real shapeshift with working movement speed.
- Druid Dash and Travel Form movement bonuses were corrected and covered by
  tests.
- Players now walk down slopes instead of detaching mid-hill.
- Final damage-over-time ticks now apply correctly at the end of a DoT window.
- Fleeing mobs no longer evade-reset inappropriately while trying to escape.
- Rare quest respawns were shortened to reduce waiting around quest objectives.
- Aldric's Fallen Star was retired from the release branch after the associated
  storyline setup moved out of scope.

## Audio

- Footstep sounds are now off by default with a player-facing toggle.
- Footstep playback was fixed so repeated footsteps no longer comb-filter into a
  metallic jingle.
- Screenshot and spectrogram harness scripts were added for footstep-toggle and
  footstep-walk verification.
- SFX settings and tests were updated around the new toggle behavior.

## Security, Server & Operations

- Dependency audit now passes with zero moderate-or-higher findings on the
  release branch.
- Server-side wallet linking, wallet metadata, `$WOC` balance reads, provider
  usage tracking, and player-card rendering are covered by new tests.
- Server HTTP utilities, rate limiting, admin database helpers, Turnstile paths,
  realm behavior, and database interfaces received targeted hardening and test
  coverage.
- Docker, Compose, deployment docs, and `.env.example` were updated to remove
  Reown project-id wiring and document the new wallet-disable flag.
- The release continues to keep RPC keys server-side for `$WOC` balance reads.

## Tests & Tooling

- New wallet coverage includes browser provider detection, late provider
  injection, signature object handling, wallet server linking, and `$WOC` balance
  proxy behavior.
- Player-card tests cover database behavior, server rendering, sharing, and
  holder broadcast behavior.
- Performance tests cover render budgets, perf reporting, and perf reporter
  behavior.
- Localization tests cover completeness, extra tables, hardcoded sweep fixes,
  server localization, and HUD chrome keys.
- New utility scripts cover market search screenshots, wallet E2E, player-card
  E2E, keybind layout screenshots, language-switch screenshots, target-frame
  visuals, dash speed charts, and footstep audio verification.

## Upgrade Notes

- The browser wallet integration no longer uses a Reown project id. Remove
  `VITE_REOWN_PROJECT_ID` from deployment configuration if it is still present.
- Use `VITE_WALLET_DISABLED=1` to hide wallet UI in environments where wallet
  linking should be disabled.
- Wallet linking now depends on an injected Solana wallet provider such as a
  browser extension or compatible wallet browser. It does not include Reown's
  cross-wallet modal, QR routing, embedded wallets, or broad multi-chain
  onboarding surface.
- `$WOC` balance lookup requires the server-side RPC configuration used by the
  wallet balance proxy. RPC keys should stay server-side.
- Release localization still depends on generated i18n artifacts. Use `npm test`
  or `npm run i18n:gen` before running direct `vitest` commands in a fresh
  checkout.
- `package.json` remains at `0.10.0` in this branch; tag/release metadata should
  carry the public v0.11.0 version unless the package version is bumped before
  publishing.

## Validation

Run locally from a clean detached worktree at `origin/release/v0.11.0`
(`a66f9ba4`):

- `npm ci` - passed, `found 0 vulnerabilities`.
- `npm audit --audit-level=moderate` - passed, `found 0 vulnerabilities`.
- `npx vitest run tests/security.test.ts tests/auth_utils.test.ts tests/wallet.test.ts tests/wallet_browser.test.ts tests/wallet_server.test.ts tests/woc_balance.test.ts tests/wallet_balance.test.ts --testTimeout=20000`
  - 7 files passed, 120 tests passed.
- `npm test -- --testTimeout=20000` - 256 files passed, 2383 tests passed,
  9 skipped.

*Generated from the public `v0.10.0..release/v0.11.0` release range. PR numbers
reference merged pull requests and source PRs preserved through release and
manual merge commits.*
