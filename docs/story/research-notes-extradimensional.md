# Research Notes — Extradimensional Battlefield (异空间战场)

Required by `docs/content-depth-standards.md` §2. Triggered by the 2026-08-23 player
feedback item #10: the game currently only has the normal-map story track; the
player expects a distinct alternate-dimension combat zone from the source novel.

**Source:** 我的战舰能升级 (*My Warship Can Level Up*), by 酣歌 (Han Ge), Faloo. Same
source as `research-notes-act3.md`. Research for this pass done 2026-08-23 via 6
additional web searches plus direct fetches of two Baidu Baike entries and a Faloo/
Qidian mirror page. Same access obstruction as documented in Act III's notes (Baidu
Baike entries are metadata stubs, most aggregators return only the one-paragraph
synopsis, no chapter-text access).

## What's confirmed (same finding as Act III, re-verified independently this pass)

Every independent source — Baidu Baike (both the 58447051 and 62057775 entries),
Faloo, 懒人听书, 起点, comic-platform synopses — repeats the same core-loop
description near-verbatim: the protagonist's special "火种" (Spark-class) warship can
**定期进入异空间，收割源点，强化自身** — "periodically enter alternate/different
space (异空间) to harvest Source Points (源点) and strengthen itself." This is the
novel's baseline progression loop, not a side arc, present from the opening volume.
Emberwake's existing Origin Rift mechanic (a resource-harvest POI, introduced Act
III — see `research-notes-act3.md`) is already the correct adaptation of this real
mechanic's *premise*.

One new, mildly useful synopsis fragment surfaced this pass and is corroborated
across sources: the system also grants a "source point acquisition doubling" ability
("能获取三倍、五倍甚至百倍的源点" — 3x/5x/even 100x the Source Points others would
get from the same dive) and a "module trait self-selection" ability. Both are
system/protagonist powers layered on top of the same rift-diving loop, not new
information about what's inside the alternate space itself.

## What's NOT confirmed after real effort (the actual gap for this item)

No source found — across this pass's searches or the earlier Act III pass — describes
**what is inside the alternate space**: no named enemies, creatures, hostile faction,
environmental hazards, or visual description distinct from normal space. Two search
results this pass were near-misses worth flagging so they aren't mistaken for
findings later:
- A Qidian page (`m.qidian.com/book/1045015408`) with a superficially similar
  premise ("战舰升级系统") turned out to be a **different novel** — protagonist
  刘星辉, not 王动. Discarded, consistent with the wrong-novel-hallucination caution
  already logged in Act III's notes.
- A second Baidu Baike entry (id 62057775) is either a duplicate/disambiguation stub
  or another distinct work; its one-paragraph synopsis doesn't mention the alternate-
  space mechanic at all and doesn't corroborate anything new.

Coverage of the actual chapter text remains capped around ch. 150-200 of 2,756+ (per
Act III's notes) — the same wall. Further keyword search on this specific question
(tried: 空间生物/虚空/位面, comic-adaptation chapter listings, Zhihu/NGA discussion)
consistently returned either the same repeated synopsis or unrelated content. This is
a genuine research ceiling, not a shortcut.

## Conclusion for this item's design

Same honesty standard as Act III: the *premise* (a special ship periodically diving
into alternate space to harvest a resource, and getting stronger for it) is real and
well-sourced — strong enough to build a genuine distinct mode on. The *specific
contents* of that alternate space — what's fought there, what it looks like, any
named threat — are original invention, clearly flagged as such, not sourced from the
novel. This matches the project's own established practice: build on the confirmed
mechanic, invent the specifics openly rather than presenting invention as sourced.

Design direction (detailed further in the implementation commit): promote Origin
Rift from a flavor-named resource POI into an actual distinct zone — a self-contained
"dive" with its own arena, its own enemy roster (mechanically distinct per
`docs/content-depth-standards.md` §1, not a reskin of an existing faction), and its
own visual identity, reachable from the same POI that already exists on the normal
map. The normal-map story track continues unchanged alongside it — this is an
additional mode, not a replacement.
