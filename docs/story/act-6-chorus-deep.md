# Act VI — Civilization Disqualified (Chorus Deep)

Continues past Act V's ending, per player feedback (2026-08-23): the campaign
previously stopped at the Umbral Line. Opens on the political aftermath of Second
Ignition, then follows a genuine, sourced novel arc into a new discovery.

Galaxy: **Chorus Deep** — two systems (Choir's Threshold, the Dyson Choir), unlocked
after Act V's epilogue. Chapters 1–3 stage in Bauhinia Prime (the political half of
the arc); Chapters 4–6 take place in the new galaxy.

**Novel grounding:** see `docs/story/research-notes-act6.md`. Unlike Act V (no
usable source material found), this pass found a real, multi-source-confirmed
sequence never drawn on before: ch.375–379 (a coalition/command-authority arc —
"Heroes Converge," "I Want Supreme Command!," "Partners, Not Hierarchy," "Military
Secrets," "Bold Actions When War Clouds Gather") immediately followed by ch.380–382
("Dyson Sphere System!," "Gospel Civilization!," "Civilization Disqualified!").
Chapter *titles and sequence* are confirmed across independent sources; the actual
prose content is not accessible, so specific dialogue, the Choir as a faction, and
the causal link to the Hollow are original invention layered on that confirmed
structure — never claimed as sourced beyond the title sequence itself.

---

## Chapter 1 — Heroes Converge (three variants)

**System:** Bauhinia Prime

**Beats:**
- Real payoff for Act V Ch.4's three-way ending choice (`secondIgnitionEnding.*`,
  previously set but never read anywhere in the game) — three variant openings,
  exactly one reachable per playthrough, converging into the same Ch.2:
  - `institutional` — Kade formally reforming the Principality from inside.
  - `coalition` — a standing multi-faction body with no single leader.
  - `personal` — Kade stepped back; the coalition runs itself, mostly.
- All three land on the same beat: an old Umbral watch buoy has been receiving a
  signal from past the Line for months, only just decoded.

## Chapter 2 — I Want Supreme Command!

**Beats:** the first real stress-test of the coalition model — multiple delegations
try to claim command of the expedition by precedent (Principality) or by having won
the war (Swanreach). Kade refuses to let anyone hold supreme command, including
himself — the chapter's title is deliberately ironic against its content.

## Chapter 3 — Partners, Not Hierarchy

**Beats:** the compromise holds — a small joint task force, not a single flag on
top. Requiem confirms the signal's origin matches nothing in Mayeth records (unusual
in itself); the Cinder flags it as older than the Hollow. Whisper sets course.

## Chapter 4 — Dyson Sphere System

**System:** Choir's Threshold
**Combat:** `dysonSphereFirstContact` (Choir Acolytes ×3)

**Beats:** first sight of a fully intact Dyson-sphere-scale megastructure. Sentinel
constructs engage in a coordinated, rhythmic pattern the Cinder names explicitly as
"a chord" — the first on-page mention of the Choir's Choral Resonance doctrine
(see Combat.tsx) before the player has fought it directly.

## Chapter 5 — Gospel Civilization

**System:** the Dyson Choir
**Combat:** `choirDefenseGrid` (Choir Herald + 2× Choir Cantor, boss)

**Beats:** the Choir is named and characterized — a civilization that measured its
own worth by how well its parts moved together, built to be heard and judged by
something. The Cinder's working theory, stated here for the first time: the Hollow
didn't start as a weapon, it started as a standard, and something failed to meet it.
This is the act's central original-invention reveal, explicitly built on (not
claimed as part of) the confirmed ch.380-382 title sequence.

## Chapter 6 — Civilization Disqualified (Act VI Finale)

**System:** the Dyson Choir
**Combat:** `civilizationDisqualifiedFinale` (The Conductor + Herald + 2× Cantor, boss)

**Beats:** the Conductor — the Choir's last integrated intelligence — is still
running its own failed verdict on a loop. Not a hostile invader; something that
never stopped grading itself and never fought back against the judgment. Ending
Its loop is framed as mercy, not conquest — a tonal departure from Second Ignition's
coalition-scale desperation. Unlocks Anthem-class and Sanctum-class hulls (order 6,
recovered Choir refit specs — see `hullClasses.ts`), and closes with an explicit
warning-not-victory beat: "that's not a fate, that's a warning."

**New recruitable crew:** Vela, Last Cantor of the Choir (`velaCantor`, tactician,
legend) — a Choir survivor/defector, recruitable once `act6.dysonSphereSystem.cleared`
is set. Mirrors Unit 7-Requiem's "ancient-civilization defector" pattern from Act IV,
used once already and reused deliberately here rather than invented fresh.

**New faction doctrine — Choral Resonance:** every landed Choir hit builds a shared
resonance meter (visible in Combat.tsx's HUD only during Choir fights); at full
resonance every living Choir enemy strikes simultaneously. Killing enemies before it
fills is the real counterplay — fewer voices, a weaker chord — the mechanical
expression of "disqualified/discordant" that the story chapters build toward.
