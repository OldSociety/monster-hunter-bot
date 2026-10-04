# Blood Hunter: full game audit

Audit date: October 3, 2026. Assessment of the current working tree, including the existing uncommitted Arena, Shop, Wild Hunt, model, and migration edits.

## Verdict

**Blood Hunter captures the collection-and-grind outline of Injustice mobile, but only a small part of its team-building and combat experience. I rate the current implementation 4.5/10 for fidelity to that inspiration within Discord, and about 5/10 as a game design with its intended features working. Reliability is currently closer to 2/10.** These are judgment scores, not measurements of player satisfaction.

The strongest foundation is the fantasy: collecting monsters expresses the hunter's growing power, campaign chapters provide a ladder, promotions make duplicates useful, and raids give a server a shared objective. The three styles are easy to understand. Monster art, named bosses, and Zalathor's personality help the game feel authored.

The largest design gap is agency. Most cards contribute a number to an automatically selected top-three list. Players select a style, then watch rolls. A monster's identity rarely changes what the player does. Increasing Discord animation volume would not solve this; choosing a team, equipping a small number of meaningful effects, and deciding when to attack, guard, use a special, or tag would.

The largest implementation gap is trust. Starting players can be blocked by the starter pack; score calculations disagree; displayed rewards and probabilities differ from what is granted; raid progress and rewards have conflicting ownership; slots can pay the same pot again in an isolated scenario. Stabilizing these should precede new content.

| Criterion | Current score | Reason |
| --- | ---: | --- |
| Collection appeal | 7/10 | Large illustrated catalog, rarities, duplicates, named rewards; too many cards lack obtainable paths or distinct gameplay |
| Progression and economy | 5/10 | Multiple useful loops, but misleading numbers, abrupt power jumps, and competing score rules |
| Team construction | 3/10 | Three-card scoring resembles a team outline; automatic selection removes player ownership |
| Tactical combat | 2/10 | Style choice followed by passive rolls; Arena is an incomplete prototype |
| Discord usability | 4/10 | Embeds and buttons fit the platform; navigation, collector isolation, timeouts, and message volume need work |
| Social play | 6/10 | Shared raids are a strong platform fit; implementation and contribution rules undermine them |
| Long-term variety | 4/10 | Six chapters and multiple modes; replay often repeats the same interaction without new decisions |

The comparison is with **Injustice: Gods Among Us mobile**, not Injustice 2. Warner Bros.' product description emphasizes a roster, moves, powers, gear, three-on-three combat, specials, upgrades, and competitive rewards. That is the reference for the comparison above. [Warner Bros. App Store listing](https://apps.apple.com/us/app/injustice-gods-among-us/id575658129).

## Scope and verification

Reviewed all eleven command entry points, their screens and relevant helpers, all six loaded campaign pages, dormant page 7/8 templates, models, persistence, migrations, schedules, documentation, and the existing test suite. All eleven command definitions serialize successfully for registration. Layout assessment comes from the actual embed/component builders; I did not play a live Discord session or inspect phone screenshots. Mobile wrapping, image loading, actual API timing, and production behavior remain unverified.

Verification included:

- Read-only examination of `config/dev.sqlite`; no player records were changed or printed individually.
- Exact probability calculations matching the rounded player roll and discrete enemy roll.
- Reward calculations for all **36 hunts and 311 encounters**.
- Isolated scenarios using fake users, fake component collectors, and actual game functions.
- A fresh migration replay against an **in-memory database**.
- Existing Jest suite: **4 passed, 2 failed**. Both failures expose obsolete or invalid test setup; neither proves the rest of the game works.
- Hunt, Wild Hunt, and Arena modules load successfully on the installed Node v22.9.0. Mixed ESM/CommonJS is a portability concern, not a reproduced load failure on this machine.

The first ordinary `npm test` invocation hit a Windows path-permission error. Running Jest directly with Node's preserve-symlinks flags completed. The same flags work for the included audit scripts.

Reproducible evidence: [diagnostic script](C:/Users/headm/code/blood-hunter-bot/audit/game-audit-diagnostics.cjs), [diagnostic results](C:/Users/headm/code/blood-hunter-bot/audit/game-audit-diagnostics.json), [isolated scenario script](C:/Users/headm/code/blood-hunter-bot/audit/game-audit-scenarios.cjs), [scenario results](C:/Users/headm/code/blood-hunter-bot/audit/game-audit-scenarios.json).

```powershell
node --preserve-symlinks --preserve-symlinks-main audit/game-audit-diagnostics.cjs
node --preserve-symlinks --preserve-symlinks-main audit/game-audit-scenarios.cjs
node --preserve-symlinks --preserve-symlinks-main node_modules/jest/bin/jest.js --runInBand --verbose ./__tests__
```

## Bugs and reliability findings, in priority order

P0 = blocks onboarding, corrupts the economy, or risks the wrong environment. P1 = materially breaks a mode, rewards, progression, or interaction isolation. P2 = clarity, completeness, maintainability, or polish. “Reproduced” means local calculation, isolated execution, or read-only data inspection, not a live Discord exploit.

### P0: starter pack cannot resolve its selected card

**Confirmed by code and read-only lookup.** `allowedMonstersByPack.starter` contains objects such as `{ monster: 'dryad' }`; the Shop passes the whole object to `pullSpecificMonster`, which compares it against a string index. All starter choices fail. The player begins with 500 gold, below the 800-gold Common pack price, so the advertised first-session path stops here. Daily rewards can provide a workaround, but the introduction should work immediately.

Fix the lookup to use the index property, validate the result before any payment, and persist an explicit one-time starter claim. The purchase handler currently relies on the screen to restrict starter availability; it does not recheck eligibility when processing the action. Ideally grant three introductory cards, one per style, and guide the player through the first battle.

Source: [Shop.js:470](C:/Users/headm/code/blood-hunter-bot/commands/Shop/Shop.js:470), [shopMonsters.js](C:/Users/headm/code/blood-hunter-bot/utils/shopMonsters.js).

### P0: slots cash-out can leave another collector and the paid pot active

**Reproduced with the actual slots function and fake collectors.** During cash-out, `gameState.running` is true when `newCollector.stop()` runs. Its end handler creates a replacement collector. The paid pot is not zeroed. A repeated cash-out action then pays it again: a 25-gold pot became 50 gold in the isolated scenario.

Actual access to a repeat action depends on surviving/stale components and the channel collectors; I did not attempt this on Discord. The payout invariant is nevertheless broken. Set terminal state and consume the pot before stopping collectors, restrict actions to the owning message/session, and enforce one payout per session transactionally.

There are related lifecycle bugs: `currentCollector` is assigned without a declaration, becoming shared process state in this non-strict file; renewal intervals are never cleared; the initial bet collector is not registered in the shared collector map; “already active” handling deletes the flag instead of rejecting a second session. These allow overlapping sessions and can leak timers or affect another player's collector.

Source: [Slots.js:671](C:/Users/headm/code/blood-hunter-bot/commands/Slots/Slots.js:671), [Slots.js:730](C:/Users/headm/code/blood-hunter-bot/commands/Slots/Slots.js:730).

### P0: production always uses the development database configuration

**Confirmed by runtime inspection.** `config/sequelize.js` explicitly selects `config.json.development`; `NODE_ENV=production` does not change the storage path. Production energy regeneration, raids, and command handlers can therefore operate on `./config/dev.sqlite`.

Select and validate the requested environment, report the resolved database path at startup, and prevent development and production processes from sharing it. `DATABASE_URL` in the README is not used by this connection module.

Source: [sequelize.js](C:/Users/headm/code/blood-hunter-bot/config/sequelize.js).

### P0: clean installation cannot replay the migration history

**Reproduced in memory.** The third migration fails with `duplicate column name: rarity`: the original Collections creation now includes rarity, and a later migration adds it again. Users creation similarly includes fields later added by migrations (`current_raidHp`, `base_damage`, Wild Hunt fields); RaidBoss creation includes later-added score, active, difficulty, and participant fields.

The local database records **40 migrations, with 20 corresponding files absent from this checkout**. Existing databases can therefore hide a broken fresh-install path. Several rollback functions also target the wrong table: raid HP down migration targets Collections, and the Arena effect up/down migrations target different tables.

Restore a reproducible baseline and write additive migrations for subsequent changes. Test both a fresh database and an upgrade copy. Do not silently rewrite deployed migration history or normalize historical card stats without a compatibility decision.

Source: [Collections creation](C:/Users/headm/code/blood-hunter-bot/migrations/20241023212406-create-collection.js), [rarity migration](C:/Users/headm/code/blood-hunter-bot/migrations/20250201082348-add-rarity-to-collections.js), [Arena effect migration](C:/Users/headm/code/blood-hunter-bot/migrations/20250504175957-add-arena-effects-to-collections.js).

### P1: raid contributions may never persist

**Reproduced using an actual Sequelize model instance.** The battle mutates the existing participants object and assigns the same object back. Sequelize reports `changed('participants') === false`. Saving with a fields list does not make that nested mutation dirty. Use a new object or explicitly mark it changed; preferably store contributions in rows and increment them atomically.

The model/migrations also default participants to an array, while battle code treats it as a user-ID map. String properties added to an array disappear under JSON serialization. `JSON.stringify(participants)` returned `[]` in the probe. The local database currently has object-shaped participant values, so that specific array problem is a new-record/reset hazard rather than the shape of all inspected records.

Source: [raidHandler.js:81](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidHandler.js:81), [RaidBoss model](C:/Users/headm/code/blood-hunter-bot/Models/MonsterList/RaidBoss.js).

### P1: raid difficulty advancement conflicts with victory finalization

**Reproduced.** A Normal kill advances the stored stage to 2 and resets HP, but the final persistence block overwrites that reset with the old local `bossHP = 0`. The caller then enters global cooldown on any victory, ending the raid before the announced Hard mode can be played. `enterCooldownEarly` resets all bosses' HP again. This is three conflicting transitions for one kill.

Use one authoritative transition: kill Normal -> pay that stage once -> activate Hard; kill Hard -> Nightmare; kill Nightmare -> final settlement and cooldown. Reset stage and contribution state explicitly at the next raid start.

Source: [raidHandler.js:98](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidHandler.js:98), [raidHandler.js:170](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidHandler.js:170), [raidHandler.js:383](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidHandler.js:383).

### P1: raid rewards have conflicting inputs and can repeat

**Confirmed by code; object-input error reproduced.** `processGlobalRaidRewards` expects an iterable list of user IDs. One caller passes a participants object, causing `paidUsers is not iterable`. The scheduled payout passes `globalRaidParticipants`, a Set that no active code adds users to. Scheduled settlement also selects `currentIndex`, which stays at zero, while encounter code selects the last active boss. The local database has all seven bosses marked active, consistent with active being used as rotation history rather than a unique current encounter.

The cooldown `/raid` path calls the payout processor whenever eligible participants remain. There is no durable claim ledger or settled flag. A repeat view can repeat payment once contribution persistence is fixed. Conversely, the scheduled empty Set can pay nobody and then clear participation. Full gold and gear on a live kill go to the killing player's `user`, while cards go to all recorded participants; the 2% rule is not consistently applied.

Replace all payout entry points with a single settlement operation keyed by raid ID, stage, and recipient. Make opening a reward screen read-only. Define whether contributions accumulate across stages and whether 2% is required for every reward. A process-global `rewardsDistributed` boolean is not sufficient; starting another user's encounter resets it.

Source: [raidRewardsProcessor.js](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidRewardsProcessor.js), [raidTimerHandler.js](C:/Users/headm/code/blood-hunter-bot/handlers/raidTimerHandler.js), [raidParticipants.js](C:/Users/headm/code/blood-hunter-bot/commands/Raid/raidUtils/raidParticipants.js).

### P1: concurrent raid fights can overwrite damage or player health

**Code-supported concurrency risk.** Per-hit boss decrements are atomic, but a later save writes the loop's old local HP back to the shared record. Another fighter's damage between those operations can be lost. Participant-map replacement similarly loses concurrent increments. No per-user battle guard stops several `raid_style_*` actions starting parallel loops. Player HP is saved only at the end and can overwrite healing.

Keep server boss HP authoritative; never assign it from a stale local copy. Store each action and contribution atomically, use stage/version checks, clamp credited damage to remaining HP, and grant victory rewards exactly once. Bound an attack session by turns or time rather than letting it run until a 300,000-HP boss or the player dies.

Additional confirmed rule mismatch: raids clamp advantage to at least 1, silently removing all style disadvantages. Selecting a style when HP is zero resets HP to full in the handler, despite the UI directing the player to heal. Stale style buttons can bypass the intended healing cost.

### P1: channel-wide collectors cause cross-screen and cross-player interference

**Confirmed routing defect; API manifestation not tested live.** Hunt, Account, Shop, Raid, Arena, and Slots generally filter only by user, not message or session. A style collector with `max: 1` can consume an unrelated button. Collection pagination listens to every component in the channel and responds to other users' clicks with “not your navigation,” competing with their actual handler. For the owner, any ID other than `next` or `end` decrements the page. List and Arena collectors are not included in the shared cancellation map.

Use message-scoped collectors or one central router with opaque session IDs, explicit allowed actions, state/version checks, and a per-session processing guard. Inspecting `/account` should not stop an ongoing hunt. Retry collectors must also be registered and cleaned up. Raid's end handler renews even after generic cancellation, so stopping it through the shared map can create another untracked collector.

Source: [List.js:193](C:/Users/headm/code/blood-hunter-bot/commands/List/List.js:193), [encounterHandler.js](C:/Users/headm/code/blood-hunter-bot/commands/Hunt/huntUtils/encounterHandler.js), [collectors.js](C:/Users/headm/code/blood-hunter-bot/utils/collectors.js).

### P1: score rules disagree and some calculations use stale user instances

**Confirmed; mismatches observed read-only.** `topCardsManager` sorts by CR first, then score. `verifyUserScores` sorts by score only. `updateUserScores` maintains another incremental path. Receiving a new high-CR card can replace a stronger promoted card; opening Account can change the score again. The validation script also uses CR-first sorting, so it does not independently validate the score-only rule.

Example: CR 4 rank-7 Common has score 96; CR 5 rank-1 Uncommon has score 50. CR-first selection favors the weaker card. In the local snapshot, two overall user totals and one Spellsword total disagree with the score-only calculation. **35 of 240 stored card scores differ from today's rank/rarity formula**, potentially reflecting earlier tuning. Do not automatically overwrite them without defining historical compatibility.

Hunt awaits verification but ignores its returned fresh user. Raid's welcome builder calls the asynchronous verification without awaiting it. The verifier only updates top-card IDs when the total changes, leaving wrong IDs untouched if their replacement has the same total.

Make one pure canonical calculator, choose deterministic tie-breaks, update IDs and totals together, and use the returned current state. Persisting balance, earning a card, promoting, and recalculating scores should form coherent transactions.

Source: [topCardsManager.js:14](C:/Users/headm/code/blood-hunter-bot/handlers/topCardsManager.js:14), [verifyUserScores.js](C:/Users/headm/code/blood-hunter-bot/utils/verifyUserScores.js), [Hunt.js:32](C:/Users/headm/code/blood-hunter-bot/commands/Hunt/Hunt.js:32).

### P1: Werefolk Rare chance is zero

**Exact calculation.** Both Werefolk tables use 0.38 Common + 0.68 Uncommon + 0.02 Rare = 1.08. `selectTier` draws from [0,1), so the second cumulative boundary is already 1.06. Actual outcomes are **38% Common, 62% Uncommon, 0% Rare**. The Rare pool is unreachable.

Use a validated probability table summing to one, or explicitly normalize weights. Test every configured tier and ensure its eligible pool exists. Avoid duplicating the schedule and probabilities in Shop and its helper.

Source: [Shop tier table](C:/Users/headm/code/blood-hunter-bot/commands/Shop/Shop.js:55), [rotating pack handler](C:/Users/headm/code/blood-hunter-bot/commands/Shop/handlers/handleRotatingPack.js), [cacheHandler.js](C:/Users/headm/code/blood-hunter-bot/handlers/cacheHandler.js).

### P1: purchases and promotions lack atomic eligibility/payment checks

**Confirmed missing guards; concurrency consequences inferred.** Gold/eggs/gear are charged before a card is resolved and granted; retrieval failures do not refund payment. Dragon error handling references `DRAGON_PACK_DESCRIPTIONS` without importing it. Promotions restrict the menu to rank < 7 but never recheck the cap on confirmation. Training checks neither remaining copies nor another active session at confirmation. Concurrent or stale actions can spend the same copy or create invalid state.

Long-lived user instances and JSON currency writes can overwrite gains or regeneration from another command. Reloading before a save reduces staleness but does not make the action atomic. Add DB uniqueness for a user's owned monster, one Arena profile per user, and active training/session rules; check nonnegative balances/copies and valid ranks in the transaction.

### P1: rarity differs between storage, pack eligibility, displays, and promotions

**Observed in local data and code.** Four catalog cards have CR-derived rarity disagreements: Black Pudding (CR 11, Common), Gargoyle (CR 7, Common), Hydra (CR 13, Uncommon), Werewolf Wolf (CR 5, Common). Pack selection honors stored rarity; Shop promotion derives rarity from CR. The Rare pack advertises pool entries that cannot be selected from its stored Rare tier, including Black Pudding and Hydra.

Dragon purchases force **every dragon to Very Rare**, including Common wyrmlings and Uncommon young dragons, while the embed color still reflects the cached original rarity. Legendary reward embeds show CR × 10, but acquisition applies the rank-1 Legendary multiplier 1.05. A Pit Fiend displayed as 200 is stored at 210 under today's formula.

Choose explicit card rarity as authoritative if custom tuning is intentional. Validate catalog changes and derive color, stars, promotion costs, and score from it everywhere.

### P1/P2: incomplete modes and misleading feedback

- **Arena:** allocation buttons have no collector or registered handler; derived stats shown on Overview are ignored in fight calculations; Intelligence and Agility do not affect battle. `arenaEffect` exists for 44 catalog rows locally but is absent from the Monster model, so normal ORM queries cannot supply it. Freeze and Reflect set state that the enemy turn never consumes. Fierce cooldown is cleared immediately before rendering, permitting Fierce every turn. Poison can kill the enemy during upkeep without a victory check. Only a 15-HP test dummy exists; there is no functioning match progression or payout.
- **Wild Hunt:** Begin remains available and can launch overlapping, unawaited loops. Cancel stops its menu collector, not the fight loop. The 60-second collector expires while the loop keeps going. After all 87 local beasts, the index resets and difficulty drops to the first set. Long automatic runs can outlive interaction tokens. The reward prompt tells players to react while the actual wheel uses buttons. A paid buy-in has no persisted entitlement if the player cancels before Begin.
- **Training:** the footer promises automatic application, but only returning to `/train` and pressing Finish applies the reward. Only the first 25 eligible cards are selectable. Bonus is rolled separately in preview and confirmation, so the displayed possibility is not the selected outcome. Cap checks can reject a useful partial bonus even though completion code supports partial application.
- **Daily:** before a claim, the displayed day is one behind the awarded day after the first claim. On the 81st claim, the handler grants day 1 but resets the stored count to 1, so the next claim grants day 2 while displaying day 1. Missing demon data still consumes the claim/streak progression because an error embed is returned as if the grant succeeded.
- **Hunt:** styles with no cards but positive base damage are rendered as available, then rejected because `runBattlePhases` treats a zero style score as invalid. Insufficient-energy selection edits the parent reply without acknowledging the component. Ichor cancellation mutates JSON without marking it changed, risking an unpersisted refund. Retry text says three revives, but only two retries are offered; retries reset per enemy. Selection timeout says a style was not chosen even when the user was browsing hunts. Encounter titles test numeric difficulty against `'boss'`, hiding boss labels. Page unlock announcement is commented out.
- **Account / Help:** Account displays rank `/8`, Shop caps at 7, and score tables run to 10. Help directs users to nonexistent `/status`, calls the playable collection command admin-only, and omits Account, Train, Raid, Wild Hunt, Slots, and Arena. Several Cancel messages say they return to a menu but remove all controls instead.
- **List admin filters:** HP uses ordinary `gte/lte` keys instead of Sequelize operators; the documented CR `all` input becomes NaN. Finish removes controls without acknowledging its click.

## Page-by-page experience and improvements

### Account: Welcome, Overview, Brute, Spellsword, Stealth

The Overview has a sensible emphasis on total and style scores. Style pages show the three contributors, which teaches the roster mechanic. However, six currency icons in a footer are difficult to decipher, collection completion uses hard-coded totals, and the first screen requires a second command to do anything useful.

The local catalog has 334 monsters, while the displayed rarity totals sum to 268. CR-derived counts are 209 Common, 69 Uncommon, 31 Rare, 10 Very Rare, and 15 Legendary; stored rarities differ slightly because of the overrides above. Approximate availability mapping found **139 of 334 cards without an active acquisition route**, even ignoring runtime bugs. That mapping unions shop pools, daily demons, dragon purchases, all beast rewards, Slots Pit Fiend, and raid loot; it is a design diagnostic, not proof that all remaining 195 are practically obtainable.

Make Account the home screen: current teams, next campaign target, energy recharge time, ready training, daily claim, and buttons to Collection, Hunt, and Store. Name currencies on at least the primary screen. Show completion against **obtainable** catalog entries and expose locked/unreleased cards separately. Style views should explain why each card is chosen and show the score gain from the next promotion.

### Collection: player browse and admin tools

Ten inline card entries per page are serviceable, but three-column embed fields can become dense on phones. There is no card-detail view, image browsing, rarity filter, score sort, search, acquisition hint, or direct upgrade action. The command description discourages ordinary players by saying ADMIN.

Use `/collection` as a player-facing command; put maintenance under `/admin`. Default to strongest/useful cards, provide style and rarity filters, and open a card detail panel showing art, rank, copies, team contribution, ability, next upgrade, and where to obtain copies. Mark favorites so rare duplicates cannot accidentally be spent in training. Dynamic pagination should be scoped to its message and clamp bounds.

### Store: main packs, rotating packs, Ichor, Dragon Shop, promotions

The two-row storefront fits Discord, and the promotion preview already shows an intelligible before/after score. The weaknesses are missing odds/content previews, no actual back navigation, stale balances, hidden unaffordable options, and split logic across large duplicated handlers.

Show all offers with requirements, including disabled Dragon purchase controls that explain how to earn eggs. A pack detail panel should list guaranteed rarity, eligible cards, duplicate behavior, exact odds, and price. Explicit card chance is currently altered by inverse-CR weighting; a configured Couatl 2% becomes approximately **1.0161%** in the inspected Common pool. Label weights as weights or remove the extra reweighting.

Keep Ichor's description honest: it raises the roll floor, not a universal 20% win chance. Upgrade confirmation should show **team score impact**, not just card score; upgrading a reserve card may contribute nothing immediately. Move promotions to Collection as well as retaining a shortcut in Store. Add a real Back button and refresh the current balance after each purchase.

### Hunt: chapter selection, encounter, fight, retry, summary

Chapter prose and ascending hunt unlocks give the game direction. The encounter screen currently hides the most useful information: enemy strength, its actual style, how the player's style matchup changes power, and likely success. CR is flavor here; campaign combat uses the manually supplied `difficulty` number, not monster HP/CR.

Preview the encounter sequence and total cost before starting. Show each style's effective strength and matchup, label the enemy as Normal/Mini-boss/Boss from its actual type, and offer a recommended team with an explanation. Put unlocked and locked chapters in a consistent navigation system.

Battles currently generate a fresh follow-up for every phase, plus introductions and results. Winning hits return before showing the final phase, and the red bar measures four successful rolls rather than simulated HP. A ten-fight hunt can require minutes of watching near-identical text. Edit one battle panel, optionally retain a compact log, and offer Fast Resolve for familiar content. Keep public posts for rare pulls, first clears, and cooperative milestones; routine outcomes should stay private or be shareable on demand.

Provide Retry, Continue, Replay, Next Hunt, and Home controls at appropriate points. Settle earned rewards on interruption instead of losing completed-fight gold because the player opens another screen. Preserve or explicitly end a paid run when the bot restarts.

### Six campaign chapters and their planning

All 36 IDs are contiguous; declared encounter counts match actual arrays; all referenced monsters have local catalog records and asset filenames. Those are good content foundations. The progression is **76 entry energy** for one clear of every hunt before losses/retries.

| Chapter | Hunts / encounters | Entry energy across chapter | Enemy score range | Assessment and improvement |
| --- | --- | ---: | --- | --- |
| 1: Wyrmling's Trial | 1–3 / 13 | 3 | 4–11 | Good introductory style hints. A random single starter teaches a style the player may not own. Guarantee one card per style and make this an interactive tutorial. |
| 2: Wyrmling's Trial | 4–8 / 36 | 6 | 7–73 | A clear dragon target, but encounters rise from 4 to 10 and strength ramps quickly. Add team-readiness guidance and a distinctive chapter-boss rule. |
| 3: Curse of Maud | 9–15 / 52 | 9 | 76–228 | Stronger mystery framing, with confusing Maud/Ezmerelda naming. Boss payout makes earlier farming attractive; connect clues and unlocks to completion results. |
| 4: A Dragon's Revenge | 16–22 / 70 | 16 | 155–356 | Every hunt has ten encounters. Increase mechanical variety instead of repetition, repair first-clear payouts below replay rewards, and give named antagonists a readable effect. |
| 5: Road to Hell | 23–29 / 70 | 21 | 308–550 | Enemy-strength jump and fixed ten-fight length amplify grind. Offer checkpoints, varied objectives, and guaranteed collection progress toward the next team upgrade. |
| 6: Sanity Check | 30–36 / 70 | 21 | 700–929 | Large jump from the previous boss; numeric-string difficulty works but makes data inconsistent. Flesh out the Solar story and add a satisfying ending and post-campaign challenge. |

Page 7 and 8 in `utils` are unloaded templates with blank monsters/names and repeated IDs starting at 20. They are not playable planned chapters. Do not move them into the loaded directory until schema validation, unique IDs, acquisition goals, difficulty targets, and narrative are complete. `finalBoss` sometimes uses display names rather than indexes and is not used by the encounter logic; standardize this as validated metadata.

### Raid: welcome, style selection, heal, fight, end-of-week

Raids are the best opportunity to make Blood Hunter feel native to a Discord community. Shared HP and weekly timing create a common story. Current screens do not show contribution, qualification progress, personal expected loot, or trustworthy stage progress.

Show an explicit raid ID, stage, end timestamp, boss mechanics, server progress, your credited damage, and your reward eligibility. Replace open-ended fighting with a bounded attempt of perhaps 5–10 decisions or a short automatic damage run. Keep a persistent public raid board and private personal actions. Apply minimum contribution rules consistently and guarantee modest rewards for newcomers who participate meaningfully.

Paid healing charges 10 tokens even for one missing HP. Consider proportional token costs or a percentage refill. Natural healing is 10% every six minutes, approximately one hour from empty, with rounding favoring small maxima. Explain that schedule accurately. The current in-memory timer/phase state can reopen an early-finished raid on restart, lose rotation identity, or show misleading cooldown time; persist start/end times and calculate remaining time once.

### Wild Hunt: entry, cooldown, buy-in, automatic ladder, reward doors

The escalating beast ladder and five-win reward cadence suggest a Survivor-style mode. But the player cannot make a survival decision: no team swap, persistent attrition, safe extraction, or meaningful reward choice. Doors hide randomized rewards, so selecting one provides ceremony rather than strategy.

Make it a bounded expedition with an explicit run state and **Continue / Extract** between sets. Keep difficulty based on total sets completed, including after the catalog cycles. Carry HP or limited recovery across encounters, permit a reserve-team tag, and make reward doors choices between disclosed categories or visible risk levels. Use a fair Fisher–Yates shuffle if hidden doors remain; `sort(() => Math.random() - .5)` is not an unbiased shuffle.

Current buy-ins cost 1,500 / 3,000 / 4,500 / 6,000 gold, totaling 15,000, and reset a moving 24-hour cooldown. Each five-win wheel has three 360-gold doors, one 180-gold + five-gear door, and one 180-gold + beast door. If doors were uniformly shuffled, the expected reward would be **288 gold, one gear, and 0.2 beast cards per set**; the current sort makes position probabilities less clean. Gold alone recoups the first buy-in in about six sets and the fourth in about 21. Display this as an optional challenge opportunity and persist paid entry credits across cancellation/restart.

### Training: choose copy, confirm sacrifice, waiting, Finish

Training gives reserve duplicates a purpose and lets collection breadth contribute to hunter power. The core tradeoff is underexplained: using a copy for training prevents using it for promotion, often sacrificing tens of style-score points for only one or two base-damage points.

Explain exactly which copy is spent; never imply that the owned original is removed. Compare Train versus Promote side by side. Show remaining base-damage capacity and a Discord timestamp for readiness. Complete eligible sessions when next read or with a durable worker, including after restarts; do not promise automatic application unless it exists. Add pagination/filtering, favorite protection, partial gains at the cap, and a single stable bonus result.

### Slots: stake, Red/Blue/Green/Silver/Gold, cash-out, replay

The demon-host theme and push-your-luck decision create more immediate agency than campaign combat. That personality is worth keeping. The screen should accurately identify the prize as Pit Fiend; the intro currently says Balor and then Pit Fiend. `Monster` is not imported, so the Pit Fiend branch throws and cannot award the card.

Show current stage, stake, pot, risks, resource rewards, and cash-out clearly in a stable panel. Keep ordinary spins quick. Make the jackpot persistent, clear the session and timers on every terminal outcome, and allow a safe resume or automatic cash-out policy on timeout. Do not use the running/busy flag as a synonym for “session is alive.”

Stakes of 1/10/25/100 spend linearly more tokens but scale ordinary gold by square root, and resource/jackpot chances do not improve. A 100-token stake gets about 10× ordinary gold for 100× the cost; its jackpot is the same. That should be explicitly disclosed or redesigned. Gambling should be an optional side loop with a reliable non-random path to needed energy and cards.

### Daily and Help

Daily's ten-step ladder and rotating demons are a good retention feature, especially because the implementation does not reset progress for missing a day. Call it a reward track rather than a streak if missed days do not break it. Use one shared next-claim calculation for preview and grant, and choose either a visible daily reset or a clearly displayed rolling cooldown. The current rolling 24-hour rule drifts later when a player claims late.

Help should teach **Start -> Collect -> Choose team -> Hunt -> Upgrade**, with links/buttons to each screen and complete explanations of styles, retries, Ichor, resources, training, and raids. Generate the command list from registered player commands so it cannot keep advertising removed names. The commented-out Free command and old specialty selection are dormant; remove or clearly archive them rather than treating them as available gameplay.

## Combat and economy math

### Current card power and team selection

Card score is `round(max(CR, 1) × rarity/rank multiplier × 10)`. Total power is intended to be the sum of three cards; each style separately sums its three highest cards. All CR below one are identical in baseline strength. This is simple, but it flattens the identity of 84 fractional-CR catalog monsters. Stored schema declares CR as INTEGER even though the local SQLite database contains fractions; use a numeric type reflecting the content if portability matters.

At rank 7, representative maximum CR scores are Common 96 (CR 4), Uncommon 224 (CR 10), Rare 360 (CR 15), Very Rare 618 (CR 19), and Legendary 1,200 (CR 30). Very Rare rank 5 -> 6 jumps from 1.4× to 2.5×, an increase of about **78.6%**, while some earlier upgrades add only 5–10%. Legendary has a similar jump at rank 4 -> 5. These milestones can motivate collection, but should be explicitly advertised and balanced against duplicate availability.

Use one declared maximum rank. Smooth progression or explain milestone evolutions as special rewards. Add a modest passive/ability identity so a lower-stat support card can still earn a team slot. Keep CR as a content input rather than the whole identity of a collectible.

### Current hunt win probabilities

The player samples a rounded roll from `0.15 × styleScore` to `(styleScore + baseDamage) × matchup`; Ichor changes the lower bound to `0.30 × styleScore`. Matchup is +10% for advantage and -25% for disadvantage. Enemy rolls are uniform integers from 0 to strength for Normal, ceil(25% strength) to strength for Mini-boss, and ceil(50% strength) to strength for Boss. Ties favor the player. Four successful phases win, with at most seven phases.

If a phase succeeds with probability p, fight success is:

`35p⁴(1-p)³ + 21p⁵(1-p)² + 7p⁶(1-p) + p⁷`.

The exact calculations below use enemy score 1,000, base damage zero, neutral matchup, and the implemented rounding. Small encounters have slightly different odds because of integer rounding.

| Player score / enemy score | Normal win | Mini-boss win | Boss win | Boss win with Ichor |
| ---: | ---: | ---: | ---: | ---: |
| 0.75 | 35.4% | 8.2% | 0.3% | 0.5% |
| 1.00 | 66.1% | 37.4% | 11.9% | 21.3% |
| 1.25 | 86.0% | 68.8% | 43.7% | 65.4% |
| 1.50 | 94.2% | 85.6% | 68.8% | 89.2% |
| 2.00 | 99.0% | 97.1% | 91.5% | 99.6% |

The boss floor is a much larger difficulty modifier than its visible score suggests. The Ichor promise of “20% increased chances” is false as a general rule: at equal neutral scores it adds approximately 9.4 percentage points against a boss, while at 1.25× it adds 21.7 points. The unused `calculateWinChance` helper calculates a different model and should not be used for previews.

A ten-fight sequence also compounds failure. If every fight has 90% success, a run without retries succeeds only `0.9¹⁰ ≈ 34.9%` of the time. Two retries per fight raise each encounter's eventual success to 99.9%, making a ten-fight run about 99.0%, at the cost of extra energy and time. That large difference should be part of balance simulation, not guessed from enemy scores.

Recommended starting targets, to be verified in playtests: introductory battles highly reliable with the provided team; ordinary new content roughly 85–95% with an appropriately upgraded team; major bosses challenging but understandable, with disclosed special mechanics. Add difficulty indicators based on actual win probability. If tactical choices are introduced, measure outcomes by player strategy as well as raw strength.

### Campaign gold and token flow

For page P >= 2, intended boss gold per energy is `250(P-1)/(1 + 0.05(P-2))`. Hunts interpolate quadratically from the previous page baseline. Final encounters receive a 36% share of target total (30% × 1.2); true bosses then receive another 1.4 multiplier during settlement. This produces about **14.4% more than the displayed/generated target total** for boss-ending hunts, subject to rounding. Comments describing a 20% bonus do not match the actual operations.

First-clear rewards replace the generated final-fight reward rather than adding a bonus. As generated totals grow, old handwritten first rewards can be smaller. **16 of 36 hunts pay less on first clear than on replay.** This is a direct reward-design flaw, not merely a conservative economy.

| Representative hunt | Energy | Repeat gold | First-clear gold | Repeat gold / energy |
| --- | ---: | ---: | ---: | ---: |
| 1: Giant Fire Beetle | 1 | 16 | 16 | 16 |
| 3: Hobgoblin | 1 | 141 | 1,139 | 141 |
| 8: Oryzinax | 2 | 572 | 2,337 | 286 |
| 15: Vampire Lord Maud | 2 | 1,089 | 3,444 | 544.5 |
| 16: Hobrich the Vexed | 2 | 960 | 912 | 480 |
| 23: Purple Worm | 3 | 2,057 | 1,744 | 685.7 |
| 29: Rakshasa | 3 | 2,985 | 6,517 | 995 |
| 30: Druid | 3 | 2,620 | 1,895 | 873.3 |
| 36: Solar | 3 | 3,575 | 8,026 | 1,191.7 |

This also encourages farming the previous chapter boss: Maud offers better gold/energy than early chapter 4, and Rakshasa better than early chapter 6. That can be intentional, but harder new content needs another incentive: first-clear rewards, targeted shards, unlocks, or unique materials. Balance both gold/energy and gold/minute; ten encounters cost substantially more attention than four.

Each won encounter immediately grants one token; settlement adds another token with probability one-third. Expected tokens are **4/3 per won encounter**, but the summary reports only the random portion. Ten victories average 13.33 tokens while the summary averages 3.33. Make the result show the whole reward.

Energy regeneration is **three energy per ten minutes, cap 15**, only in production. From empty, a player refills in roughly 40–50 minutes depending on cron alignment. That supports five three-energy hunts per full bar. Persist a regeneration timestamp and calculate recovery on demand to avoid lost updates, downtime gaps, and production-only behavior surprises.

### Training math and duplicate value

Maximum base damage is the sum of owned-card ranks. This usefully rewards breadth, but training efficiency is uneven:

| CR | Base gain | Duration | Gain per hour |
| --- | ---: | ---: | ---: |
| Below 5 | 1 | 2 h | 0.50 |
| 5–8 | 2 | 4 h | 0.50 |
| 9–12 | 3 | 8 h | 0.375 |
| 13–16 | 4 | 10 h | 0.40 |
| 17–20 | 5 | 12 h | 0.417 |
| 21+ | 6 | 24 h | 0.25 |

Rare and Legendary copies are scarcer, more valuable for promotion, and not more time-efficient. Extra bonuses have expected gain approximately **0.21111** per training, with 90% granting no extra. A better design uses surplus-common training, larger advertised premium gains, or a separate training resource, while reserving scarce duplicates for clear promotion milestones.

### Slots probabilities and inflation

Red effect weights sum to 108, so its listed 12 game-over weight is actually 11.11% on ordinary spins and its 8 advance weight is 7.41%. The first spin excludes advance and game-over and renormalizes remaining weights. Other stages total 100. Call these weights internally and show actual probabilities when exposing odds.

Under an idealized policy of always spinning, with no timeout, starting from Red:

- Probability of reaching Gold: `(8/(8+12)) × (5/(5+8)) × (8/(8+12)) × (6/(6+18)) ≈ 1.5385%`.
- Probability of eventual jackpot per entry: Gold reach × `5/(5+2+20)` ≈ **0.2849%**, about one in 351.
- Probability of the Pit Fiend terminal outcome: Gold reach × `2/27` ≈ **0.1140%**, about one in 878; its actual award is currently broken by the missing import.
- A 100,000-gold minimum jackpot contributes approximately **284.9 expected gold per entry**, before ordinary winnings and resource rewards. That is an economy observation, not a recommended strategy, and ignores early cash-outs and practical lifecycle limits.

The jackpot is an in-memory variable reset after wins and on process restart; `jackpot.json` is not used by this implementation. Evaluate token-to-gold conversion, jackpot growth, and targeted-card acquisition together. Keep big wins exciting while preventing optional gambling from becoming the main reliable route through progression.

### Raid damage and reward math

Raid player rolls are 10–100% of `(style + base damage) × matchup`; enemy rolls are 50–100% of boss score multiplied by stage 1/2/3. Winning a comparison deals 10% of the player roll; losing deals 10% of the enemy roll. At neutral equal scores, stage 1 hit chance is approximately 27.8% before rounding; stage 2 leaves virtually no positive range where the player wins, and stage 3 none. This makes difficulty scaling abrupt. Separate hit chance, damage, and survival tuning instead of multiplying the entire opponent comparison range.

Full raid payout is 25,000 gold and 250 gear, with partial tiers at 25/50/75% progress. At current gear prices, 250 gear buys 25 Common promotions, 12 Uncommon, eight Rare, six Very Rare, or five Legendary. That is a major power jump and makes raid eligibility and repeat-payout prevention central to the whole economy.

The 2% participation rule requires 2,700–6,000 credited damage across the local boss catalog. Show that threshold and make newcomer participation feasible. Current per-stage resets and inconsistent threshold application can remove a player's visible contribution or award differently based on how the raid ended.

## Architecture and planning

No detailed design document or roadmap exists beyond the README, code comments, prototype models/seeders, and blank page templates. The code shows three overlapping directions: a hunter with style scores, collectible monsters that act as an automatic team, and an Arena hunter with personal RPG stats plus a card hand. Resolve that identity before expanding all three systems.

The best fit for the stated inspiration is **the monster roster as the playable team**, with hunter base damage as a modest shared account bonus. Arena can become the experimental tactical battle engine that Campaign, Wild Hunt, and eventually asynchronous PvP use. Maintaining different score-only and personal-stat combat economies indefinitely would multiply balancing and UI confusion.

Recommended technical boundaries:

1. **Catalog and balance configuration:** one authoritative definition of card rarity, stats, abilities, pack weights, rank cap, costs, and chapter data. Validate it before accepting commands.
2. **Pure rules:** team calculation, roll probabilities, damage, reward previews, and progression rules without Discord or database access.
3. **Persistent sessions:** owner, mode, state, selected team, encounter/turn, version, expiry, paid entry, cancellation/result, and credited rewards.
4. **Atomic actions and reward ledger:** unique operation IDs, conditional deductions, contribution increments, terminal transitions, and payouts that can safely be retried.
5. **Discord views/router:** message-specific controls that render current state, acknowledge promptly, and cannot process stale actions twice.
6. **Durable schedules:** persisted raid periods, elapsed-time energy/healing, training readiness, explicit timezone, and restart recovery.

Discord interactions require an initial response within three seconds, and interaction tokens last 15 minutes. Several purchase/overview paths do database work before acknowledgment, and Wild Hunt/raid loops can run beyond the original token. Deferring promptly and using short persisted attempts solves both. [Official Discord interaction documentation](https://github.com/discord/discord-api-docs/blob/main/developers/interactions/receiving-and-responding.mdx).

The existing style/rarity color language is inconsistent across Account buttons, combat buttons, and embeds. Set one palette and label meanings with text; color alone should not communicate advantage. Centralize footer/currency formatting and embed creation. Use actual catalog image URLs or attachments instead of reconstructing filenames from display names; the reconstructed paths cannot reliably handle punctuation and variant names. Do not assume every asset uses `.jpg`.

Windows currently tolerates `pages` versus `Pages` and `events` versus `Events`; Linux does not. Normalize import/directory casing and specify the supported Node version. `Models/index.js` tries to call top-level `.js` exports as model factories, including `model.js`, which exports an object; establish one model-loading path. README installation also invokes Sequelize CLI without declaring it as a dependency, and the two self-referencing `file:` dependencies deserve cleanup. These are reproducibility concerns alongside the migration failure.

## Improvements most likely to make the game enjoyable

### 1. Put team ownership at the center

Allow players to choose a three-card team, save a few presets, and see exactly how each card contributes. Begin with a small ability vocabulary: opening shield, first-special power, tag-in heal, poison strike, damage against a style, or protection for the weakest ally. Add one active special per card and one modest passive. Make weaker support cards useful without introducing hundreds of unique rules at once.

Introduce actual equipped items only after team abilities work. Current “gear” is promotion currency, not the equipment system that motivates Injustice builds. Rename it to something like Upgrade Parts until equipment exists, then let a few readable relic effects create build differences.

### 2. Build a short tactical loop that works with Discord

Use one private battle panel: three team portraits/names, active fighter, HP, power meter, enemy intent, and a short recent log. Offer **Attack, Guard, Special, Tag**, with a team selector or tag menu if necessary. A small number of turns and a clear intent mechanic can preserve the feeling of power management and switching without needing real-time tap combat.

For example: a boss signals a heavy hit next turn. The player can guard, tag in a shield-bearing monster, or spend charged power to interrupt it. Losing becomes explainable. Touch timing and 3D animation are hard platform limits; readable tactics are well within Discord's capabilities.

Prototype with roughly 12 cards and one chapter boss before converting the whole catalog. Preserve a Fast Resolve option for farming mastered stages. Keep the current automatic style fights as a transitional engine if replacing them would delay basic fixes.

### 3. Give every session a useful result

Guarantee small targeted progress: shards toward a chosen card, milestone gear, first-clear rewards, or chapter unlocks. Show a progress bar toward the player's next goal. Add direct card purchases or a limited wishlist/pity system so unlucky pack pulls do not strand players. Make all advertised completion targets attainable, or clearly identify unreleased cards.

Keep daily progress forgiving. Persist paid expeditions and settle completed encounters on disconnect. Provide a return screen with the last result and a sensible next action. Watching a minute of rolls should never end in an unexplained empty screen or missing reward.

### 4. Let Discord's community features carry the endgame

Add a server raid board, cooperative boss mechanics, personal contribution milestones, and opt-in celebratory posts. Later add asynchronous defense teams and short ranked seasons with participation rewards. Avoid live synchronous PvP initially: stored defense teams, versioned rules, bounded matches, and fair team-power brackets fit Discord better.

Collection showcases, favorite monsters, titles for chapters, and personal records can provide recognition without inflating raw combat stats. Trading should wait until balances, ownership, payouts, and duplicate constraints are reliable.

### 5. Build variety through mechanics, not only larger numbers

Give each chapter boss one clear rule: a shield that rewards tagging, a poison curse that demands recovery, a charge that can be guarded, or a phase requiring a different role. Use challenge restrictions sparingly with previewed requirements and generous introductory rewards. Wild Hunt should test attrition and extraction; Arena should test tactics; raids should test cooperation. Distinct modes need distinct decisions.

## Recommended order of work

| Phase | Work | Definition of done |
| --- | --- | --- |
| 1: Restore trust | Starter, environment selection, migration baseline, slots terminal state, canonical scores, atomic payments, raid contributions/settlement | A new account can complete the first hunt; no repeat payment; fresh install and upgrade both succeed; balances remain valid under repeated/concurrent actions |
| 2: Finish existing screens | Help, Home/Back, accurate rank/rarity/reward wording, Training pagination/readiness, scoped sessions, Wild Hunt cancellation, predictable timeouts | Every visible control works, every shown reward matches its grant, changing screens does not silently abandon earned progress |
| 3: Tune progression | Exact battle previews, first-clear bonuses, acquisition availability, pack odds, resource sources/sinks, bounded raids | Simulations and small playtests show reasonable newcomer progression and useful goals across all styles |
| 4: Add identity and tactics | Chosen teams, 12-card ability pilot, power meter, Guard/Special/Tag, one tactical boss | Players can explain why they chose their team and which decision helped or hurt in a fight |
| 5: Grow endgame | Survivor extraction, raid board/mechanics, equipment, asynchronous Arena seasons, expanded chapters | Each mode offers a distinct decision and stable repeatable reward structure |

Do not start by adding more currencies, a complete trading system, or another large page of ten nearly identical encounters. The existing catalog and loops are enough to test a much better core experience.

## Validation that should accompany repairs

The current six Slots tests are mostly command-entry mocks. The two failures are an obsolete multiple-instance expectation and an invalid construction of a Discord interaction; the supposed balance/jackpot test only checks a user lookup. There are no existing tests covering actual payouts, raid settlement, campaign progression, training completion, or pack probabilities.

Focus tests on player promises and invariants:

- Fresh account -> valid starter -> first clear -> next hunt unlock.
- Every card pool resolves; configured probabilities are valid; previews and grants agree.
- Strongest-team calculation is identical after acquisition, promotion, Account view, and battle entry.
- Paid action twice, concurrent confirmations, exhausted copies, and capped rank cannot duplicate payment or bypass restrictions.
- Two users damaging one boss preserve both damage totals; a stage kill advances once; each eligible recipient is paid once.
- Cancel, timeout, navigation, restart, and another user's click cannot mutate the wrong session.
- Training reward applies once, survives restart, and behaves consistently at the cap.
- Daily track crosses 10-day and 80-day boundaries correctly and does not consume failed rewards.
- Simulated odds agree with calculated probabilities; campaign first-clear totals are never below replay totals unless explicitly intended.

Track first-session completion, time to first three-card team, time to next useful upgrade, loss reasons, run duration, ignored/expired interactions, resource income/spending, and how often acquired cards improve a team. These measurements will distinguish an engaging long-term grind from repetition caused by bugs or lack of alternatives.

The game has enough content to support a compelling Discord collection RPG. The most valuable next step is to make the existing rules dependable, then make the monsters feel like teammates with recognizable roles. That is the path most likely to deliver the Injustice-inspired experience the current foundation promises.
