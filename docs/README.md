# Emberwake — Design Docs

Emberwake is a story-driven strategic RPG inspired by the web novel *我的战舰能升级*
("My Warship Can Level Up") — a reincarnated captain, an asymmetric AI-granted system,
and warships as the measure of political power, adapted into an original setting and
cast. See `world-bible.md` for the adaptation note and full setting reference.

Read in this order:

1. **[design-principles.md](design-principles.md)** — the tenets that settle
   ambiguous decisions. Read this first; everything else should be consistent with it.
2. **[world-bible.md](world-bible.md)** — setting, factions, characters, galaxies,
   resource glossary. Reference doc for names and terminology.
3. **[systems-design.md](systems-design.md)** — how ship/module/crew/resource/combat
   mechanics work and interlock, including the pacing model.
4. **[architecture.md](architecture.md)** — the open-map spatial model (galaxy graph +
   free-flight system view), state management, screens, save system, build/deploy.
5. **[coding-guidelines.md](coding-guidelines.md)** — stack, file organization,
   conventions, testing, commit/deploy workflow.
6. **[story/](story/)** — full chapter-by-chapter story line for all five acts:
   - [Act I — Salvage & Survival (Bauhinia Reach)](story/act-1-bauhinia-reach.md)
   - [Act II — Court & Coast (The Ridges)](story/act-2-the-ridges.md)
   - [Act III — Origin Tide (Fractured Veil)](story/act-3-fractured-veil.md)
   - [Act IV — The Deep Origin (Mayeth Awakening)](story/act-4-deep-origin.md)
   - [Act V — Second Ignition (Umbral Line)](story/act-5-umbral-line.md)

These are living design docs — when implementation reveals something in here doesn't
work, update the doc in the same change rather than letting code and doc drift apart.
