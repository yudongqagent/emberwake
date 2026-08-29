# Commercial Gap Audit — 2026-08-29

Requested: compare Emberwake against the cutting-edge games that actually sell,
and list this game's issues.

## The comparison set, and the fair framing

Measured against what is genuinely succeeding right now: **Balatro** (5M+ copies),
**Mewgenics** (1M in its first week, out-peaking Hades II), **Slay the Spire 2**
(dominating since its March 2026 Early Access), **Hades II**, **Vampire
Survivors**.

The unfair part of this comparison is obvious — those are multi-year efforts by
experienced teams with artists and composers. Emberwake is a browser game built
in a handful of sessions with zero art or audio assets. So this document is not
"why isn't this Balatro". It is: *if you wanted this to sell, what specifically
stands between here and there.* Everything below is measured from the shipped
build, not impressions.

The context that makes it matter: of **17,889 games released on Steam in 2025,
roughly half earned fewer than 10 reviews**, and only 3,000–4,000 per year reach
the 50–1,000 review band where the algorithm starts helping you. The default
outcome is invisibility.

---

## What Emberwake actually is, measured

| | Count |
|---|---|
| Story scenes / dialogue lines | 40 / 249 |
| Authored encounters | 36 |
| Modules | 200 |
| Crew | 9 |
| POIs across 7 galaxies | 60 |
| Sound effects | 12, all synthesized |
| Music tracks | **0** |
| Image assets (png/jpg/svg) | **0** — everything is canvas primitives |
| JS bundle | 487 KB |
| Tests | 207 |

---

## Issues, worst first

### 1. There is no hook in the first thirty seconds

The single most commercially decisive stretch of any game, and Emberwake's is
close to worst-case:

- **No title screen.** The game drops straight onto a dark star map with a
  dialogue box already open. No logo, no "New Game", no moment that says what
  this is.
- **94.5% of the opening screen is black.** Measured off the canvas: only 5.5% of
  pixels are above near-black.
- **15 unskippable dialogue clicks, ~1,600 characters, before the player does
  anything.** There is no skip, no fast-forward, no text-speed control.

Compare: Balatro deals you a hand within seconds. Vampire Survivors has you
moving in about ten. Hades II's design lesson from its predecessor was explicitly
to *give players almost everything up front*. Emberwake asks for several minutes
of reading before its first verb.

This alone would sink wishlist conversion. Steam trailers that open on cinematics
instead of interaction are a known conversion killer, and Emberwake's actual
opening *is* that cinematic.

### 2. No audio identity

12 synthesized blips, no music, no mix. Audio is not decoration in this category —
Balatro's and Hades' soundtracks are a substantial part of why people describe
those loops as addictive, and a large fraction of "juice" is audio, not visuals.
Right now a combat kill and a menu click are nearly the same sonic event.

This is the highest impact-per-hour item on the list. A single good loop and
fifteen real sound effects would change the felt quality of every screen.

### 3. No visual identity

Zero art assets. Every ship, station and effect is drawn from canvas primitives.
The weapon VFX work earlier this session genuinely helped, but the game still has
no logo, no key art, no character portraits, no capsule image — and a Steam page
cannot launch without a trailer, screenshots and a capsule.

The dark-blue-on-black palette also gives almost every screen the same value
range, so nothing has visual priority.

### 4. The story is the biggest content investment and the weakest presentation

249 dialogue lines across six acts, delivered through a thin bottom strip with
small text, a plain-coloured speaker name, no portraits, no character art, and no
text animation. The most-developed content in the game is its least-presented.

### 5. Content volume is thin for a paid product

249 dialogue lines is roughly half an hour of reading. 36 authored encounters
against 200 modules means the *itemization* is far deeper than the content that
uses it. Balatro ships far fewer "items" but each one changes a run; Emberwake
ships 200 modules across 36 fights.

### 6. No settings, no accessibility

No settings screen at all: no volume control (only a mute toggle), no text speed,
no reset save, no difficulty options beyond Ember Load. `aria-label` counts are
zero on most screens including the entire Refit Draft. No colourblind
consideration in a UI that encodes meaning almost entirely in colour.

### 7. Nothing structurally invites a second session

Balatro, Slay the Spire and Vampire Survivors are built on runs — you finish,
you immediately start again with different pieces. Emberwake is a linear campaign
plus one repeatable mode. The rift is genuinely good, but the campaign has no
seeded runs, no daily, no unlock-driven variety between attempts, and no ending
that invites another go.

### 8. Balance is entirely unvalidated by human play

Every number in the game was tuned by me against measurements and tests, and none
of it has been felt by a person. The weapon rebuild, the power budget, enemy
roles, Ember Load, the sortie hull economy and the draft tier curve all shipped in
one session. Tests prove they are *internally consistent*, not that they are
*fun*. This is the largest unknown in the project.

### 9. Mobile is playable but not designed for

The dialogue reads better at phone size, but the combat console stacks helm,
reactor, weapons, abilities, Nova and log into a dense column, and text clips
behind the dialogue box on the system map.

### 10. There is no commercial surface at all

No Steam page, no trailer, no capsule, no store presence, no name recognition. As
a browser build on GitHub Pages there is currently no path from "someone hears
about this" to "someone pays for it."

---

## What is genuinely strong

Stated because an issues list alone would misrepresent the project:

- **The systems layer is unusually solid.** 207 tests, and the mechanics are real
  rather than decorative — 46 implemented effects, ten structurally distinct
  weapon VFX archetypes, enemy roles with actual counterplay.
- **The rift is a good mode.** Push-your-luck with a provisional haul is the
  right shape, and the 源点 multiplier is a genuinely exciting payout.
- **The Refit Draft was the correct diagnosis.** Moving from 7 choices in a
  40-scene campaign to one every ninety seconds is the single biggest design
  improvement the project has made.
- **The source-novel grounding is honest.** Where the novel was unreachable, the
  docs say so instead of inventing provenance.

The engineering is ahead of the presentation by a wide margin. That is an
unusual and fixable position — most projects fail the other way.

---

## What I would do, in order

1. **A first-90-seconds pass.** Title screen; open on a fight, not a monologue;
   make the opening scene skippable; cut it to 5 lines and move the rest later.
   Nothing else on this list matters if players leave before the first fight.
2. **Audio.** One music loop and ~15 real sound effects. Highest felt quality per
   hour of work on the entire list.
3. **Playtest before more systems.** Nine mechanics shipped unplayed. The next
   build should be validated by a person, not by me.
4. **Decide what it is commercially.** A free browser game that is *good* is a
   coherent goal and most of this list becomes optional. A paid Steam release
   needs items 1–3 plus art, a trailer, and roughly 3–5x the content.

That fourth question is the one I can't answer for you, and it determines whether
this list is a roadmap or mostly noise.
