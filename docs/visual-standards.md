# Emberwake — Visual & Game-Feel Standards

Companion to `docs/content-depth-standards.md` — that file is about whether there's
enough *there* there; this file is about whether it *feels* like a game instead of a
web app with a sci-fi color palette on top. Every rule is written so it can be checked
by grepping the codebase or watching one interaction, not by a subjective "does it look
cool" pass.

**Origin:** an audit of the shipped UI found `.btn` was still `border-radius: 4px` —
a plain rounded rectangle — while `.panel` had the full angled-corner treatment right
next to it. Resource numbers snapped instantly on every change while their own hull
bars animated smoothly 240ms away. The seam between "the exciting canvas part" and
"the web-app part" was visible because half the interface never got the treatment the
other half did. This doc exists so that seam doesn't come back.

## 1. No native-feeling elements, anywhere

- Zero native `<input>`, `<select>`, `<textarea>` rendering with browser-default
  styling. (`grep -rn "<input\|<select\|<textarea" src` should return nothing, or only
  elements with full custom styling applied.)
- Every interactive element — buttons, toggles, tabs, cards you can tap — gets:
  - **Cut/angled corners**, not `border-radius`. Use the existing `clip-path` notch
    pattern from `.panel` (see `tokens.css`) or a purpose-built angled shape. A plain
    rounded rectangle on anything clickable is a bug, not a style choice.
  - A glow/border treatment consistent with the HUD language already defined in
    `tokens.css` (`--line-bright`, `--cyan`, `filter: drop-shadow(...)` rather than
    `box-shadow` wherever a clip-path is in play, since `box-shadow` gets clipped and
    `drop-shadow` doesn't).
  - Uppercase text with letter-spacing (`--font-display`, matching `.title`/`.eyebrow`)
    unless the content is prose/dialogue, which reads better in sentence case with the
    body font — that split is intentional, not an inconsistency.
- **Audit command:** `grep -n "border-radius" src/ui/tokens.css` — every hit on an
  interactive class (`.btn`, tabs, cards) should be gone or replaced with a clip-path;
  `border-radius` stays legitimate on non-interactive chrome (resource pills, avatar
  circles) where a soft shape is the actual intent.

## 2. Nothing snaps — every state change is animated

- **Numbers never jump.** A displayed number that changes (resources, hull, XP, damage
  totals in a summary) counts up/down over a short animated window (150–500ms
  depending on magnitude), not `{value}` bound directly to state. Build one shared
  hook/utility for this rather than re-implementing per screen.
- **Panels power-on.** A panel that appears (a new screen, a modal, a reveal) animates
  in — the `.pop-in`/`.scanline` classes already in `tokens.css` are a starting point,
  but check every *new* panel actually uses one; don't let a raw mount slip through.
- **Screen/menu transitions slide or fade**, never instant-swap. `App.tsx`'s
  `key={screen}` + `.screen-enter` pattern is the existing mechanism — every new
  top-level screen must go through it, not bypass it.
- **Bars and numbers move together.** If a stat has both a bar and a printed number
  (hull, power draw, XP), both animate on the same timescale. A bar that eases in
  240ms next to a number that jumps instantly is the exact bug this doc was written
  to catch — audit every `Bar`/number pairing for this.
- **Audit command:** grep each screen for direct `{state.value.X}`-style number
  interpolation in JSX and check whether it's wrapped in a tween/count-up. A raw
  binding on anything the player watches change (not static labels) is a violation.

## 3. Juice is mandatory on every core-loop moment, not optional polish

Every one of these events needs a **feedback bundle**, not a single effect. "Added a
particle" is not juice; juice is several small things stacking on the same beat:

| Event | Required feedback bundle |
|---|---|
| Weapon hit | Impact flash on target, particle burst sized to damage, floating damage number, brief hit-stop (1–3 frame freeze) on meaningful hits |
| Critical hit | Everything a normal hit gets, *plus*: bigger/brighter number, stronger screen shake, a distinct color, and either a longer hit-stop or a squash/stretch pop on the target |
| Kill / enemy death | Explosion particle burst, shockwave ring, brief flash-to-white before fade, screen shake scaled to the enemy's size/importance (a boss kill should visibly hit harder than a trash mob kill) |
| Taking damage | Screen shake, red flash/vignette scaled to damage severity, hull bar *and* hull number animate together (see §2) |
| Resource gain (mining, loot, reward) | Count-up on the number, a small particle/icon flourish at the source, not just a silent state update |
| Level-up / rarity reveal / draw | The biggest feedback moment in its category — this is the game's "did I get something good" beat and should never be visually smaller than a routine hit. Compare against the crit treatment above as a floor, not a ceiling |
| Jump/travel/dock | A transition with motion (streak lines, warp effect, fade-through), never an instant screen replace |

- Hit-stop and screen shake must be **scaled to event size** — a trash-mob tick and a
  boss enrage should not produce the same shake magnitude. If they do, that's a
  violation even though "screen shake exists."
- These effects are cheap (a few lines of particle/timer code) and belong in the
  *first* playable version of a system, not a later pass — see tenet 7 in
  `docs/design-principles.md`, which already said this; this doc makes it checkable.
- **Audit command:** for each event in the table, trigger it once live and confirm
  every listed element fires. Missing even one element (e.g. shake but no flash) is a
  partial implementation, not a pass.

## 4. Canvas/WebGL where impact matters, styled DOM everywhere else — no visible seam

- Combat, the system map, and any moment with motion/particles/lighting render on
  canvas (already the pattern in `Combat.tsx`/`SystemView.tsx`) — keep extending this,
  don't fall back to DOM+CSS animation for new effects-heavy moments.
- DOM-based menus (Fleet, Modules, Crew, Station) are fine and don't need to become
  canvas — but every interactive element inside them must still clear §1 and §2. The
  test is: if you screen-record a session and can point to the exact pixel where "the
  cool part" stops and "the web app" starts, that's a seam violation regardless of
  which rendering technology either side uses.
- When a DOM panel needs to reference live combat/map state (HUD overlays, popups),
  keep using the existing screen-space projection pattern (`PopupOverlay` in
  `Combat.tsx`) rather than duplicating canvas-only effects in DOM.

## 5. Checklist for any new interactive element or screen

Before calling a new UI element done, confirm all of these:

- [ ] No native browser styling visible (§1)
- [ ] Cut/angled corners on anything clickable, not `border-radius` (§1)
- [ ] Uses `--font-display` + uppercase/letter-spacing, or is intentionally prose (§1)
- [ ] Any number it shows animates on change, doesn't snap (§2)
- [ ] It enters/exits with motion, not an instant mount/unmount (§2)
- [ ] If it's a core-loop event, it has the full feedback bundle from §3, not a subset
- [ ] It has a touch-equivalent interaction (tenet 8 in `docs/design-principles.md`)
