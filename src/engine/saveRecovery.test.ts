import { describe, expect, it, beforeEach } from "vitest";
import { loadGame, saveGame, recoverableSave, getLastLoadOutcome, createInitialState, SCHEMA_VERSION } from "./save";

// The suite runs in node, which has no localStorage. A minimal in-memory stand-in
// is enough: save.ts only uses getItem/setItem/removeItem/clear.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
(globalThis as any).localStorage = new MemoryStorage();

const SAVE_KEY = "emberwake.save";
const BACKUP_KEY = "emberwake.save.backup";

/** A realistic mid-campaign save: forty hours of flags, a levelled ship. */
function campaignSave(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    resources: { salvage: 900, sourcePoints: 700, alloy: 500, originEssence: 300, insight: 40 },
    flags: {
      "act1.coldWake.cleared": true,
      "act1.firstBlood.cleared": true,
      "act2.openLanes.cleared": true,
      "act3.intoTheVeil.cleared": true,
    },
    ships: [{
      id: "whisper", hullClass: "cruiser", rarity: "advanced", aptitude: "A", scanned: true,
      name: "Whisper", level: 14, xp: 220,
      equipped: ["m1", null, null, null],
      currentHp: 800,
      rolls: { hull: 0.8, power: 0.6, speed: 0.5, evasion: 0.4, crit: 0.3 },
      ascendedFrom: ["corvette"],
    }],
    modules: [{ id: "m1", defId: "bauhiniaWeapon1", rarity: "mk1", level: 3, traits: [], lockedTraitSlot: null, quality: 0.6 }],
    crew: [], flagshipId: "whisper", currentSystemId: "amaranthBelt",
    poiState: {}, capturedShips: [], alliedShips: [],
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());

// Player report (2026-08-25): "我的任务也没了 ... 修复之前存档".
//
// loadGame was `try { parse; migrate } catch { return null }`, and its only caller
// is `loadGame() ?? createInitialState()`. Any defect anywhere in a save silently
// threw the whole campaign away and started a new game — no warning, no backup, no
// way back. Every case below used to end in a blank campaign.
describe("a damaged save is repaired, never silently discarded", () => {
  it("keeps the campaign when a migration would have thrown", () => {
    // Migration 3 destructures s.ships.find(...) — an empty ships array threw a
    // TypeError, which the old catch turned into a brand new game.
    localStorage.setItem(SAVE_KEY, JSON.stringify(campaignSave({ schemaVersion: 2, ships: [] })));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(Object.keys(loaded!.flags).length, "story progress was thrown away").toBeGreaterThan(0);
    expect(loaded!.flags["act3.intoTheVeil.cleared"]).toBe(true);
  });

  it("keeps the campaign when schemaVersion is missing or garbage", () => {
    for (const bad of [undefined, null, "seven", NaN]) {
      localStorage.clear();
      localStorage.setItem(SAVE_KEY, JSON.stringify(campaignSave({ schemaVersion: bad })));
      const loaded = loadGame();
      expect(loaded, `schemaVersion ${String(bad)} lost the save`).not.toBeNull();
      expect(loaded!.flags["act2.openLanes.cleared"]).toBe(true);
    }
  });

  it("keeps the campaign when a module references a def that no longer exists", () => {
    const save = campaignSave({
      modules: [
        { id: "m1", defId: "someRetiredModule", rarity: "mk3", level: 4, traits: [], lockedTraitSlot: null, quality: 0.7 },
        { id: "m2", defId: "bauhiniaWeapon1", rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5 },
      ],
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    // The unknown module is dropped — losing one item is recoverable, losing the
    // campaign is not — but everything else survives.
    expect(loaded!.modules.map((m) => m.defId)).toEqual(["bauhiniaWeapon1"]);
    expect(loaded!.flags["act1.firstBlood.cleared"]).toBe(true);
    expect(loaded!.ships[0].level).toBe(14);
  });

  it("turns an equipped slot pointing at a missing module into an empty socket", () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(campaignSave({ modules: [] })));
    const loaded = loadGame();
    expect(loaded!.ships[0].equipped.every((slot) => slot === null)).toBe(true);
  });

  it("salvages flags even when the surrounding save is a mess", () => {
    const wrecked = {
      schemaVersion: SCHEMA_VERSION,
      flags: { "act4.ghostProtocol.cleared": true, "junk": false },
      ships: "not an array",
      modules: null,
      resources: { salvage: "lots" },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(wrecked));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.flags["act4.ghostProtocol.cleared"]).toBe(true);
    expect(loaded!.flags["junk"]).toBeUndefined();
    expect(loaded!.ships.length).toBe(1);
  });

  it("quarantines rather than deletes a save that cannot be parsed at all", () => {
    localStorage.setItem(SAVE_KEY, "{ this is not json");
    expect(loadGame()).toBeNull();
    expect(getLastLoadOutcome()).toBe("quarantined");
    expect(localStorage.getItem("emberwake.save.corrupt")).toBe("{ this is not json");
  });

  it("preserves an intact save exactly", () => {
    const save = campaignSave();
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    const loaded = loadGame();
    expect(getLastLoadOutcome()).toBe("loaded");
    expect(loaded!.ships[0].level).toBe(14);
    expect(loaded!.resources.salvage).toBe(900);
    expect(Object.keys(loaded!.flags).sort()).toEqual(Object.keys(save.flags).sort());
  });
});

describe("previous-save recovery", () => {
  it("rolls the previous save into a backup on every overwrite", () => {
    const first = { ...createInitialState(), flags: { "act1.coldWake.cleared": true } };
    saveGame(first);
    const second = { ...createInitialState(), flags: {} };
    saveGame(second);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(JSON.stringify(first));
  });

  it("offers a previous campaign back after the live save is wiped", () => {
    const campaign = { ...createInitialState(), flags: { "act3.intoTheVeil.cleared": true } };
    saveGame(campaign);
    saveGame(createInitialState()); // the destructive event: progress replaced
    const found = recoverableSave();
    expect(found, "no recovery offered — the previous campaign is unreachable").not.toBeNull();
    expect(found!.state.flags["act3.intoTheVeil.cleared"]).toBe(true);
    expect(found!.source).toBe("backup");
  });

  it("recovers from quarantine when the backup is gone", () => {
    const campaign = campaignSave();
    localStorage.setItem("emberwake.save.corrupt", JSON.stringify(campaign));
    const found = recoverableSave();
    expect(found).not.toBeNull();
    expect(found!.source).toBe("quarantine");
    expect(found!.state.flags["act2.openLanes.cleared"]).toBe(true);
  });

  it("does not offer a backup that holds no progress", () => {
    saveGame(createInitialState());
    saveGame({ ...createInitialState(), currentSystemId: "amaranthBelt" });
    expect(recoverableSave()).toBeNull();
  });
});

// 2026-08-30 实测(/loop 第 6 轮):新玩家点「新的开始」→ 在覆盖警告上确认 →
// 开场散文刚出来,存档恢复的横幅就压在上面问他"要不要恢复之前的存档"。
//
// 判定用的是"新存档的 flag 比备份少",而**刚重开的存档 flag 就是 0** ——
// 于是每一次正常的重开都会触发。恢复提示是给"存档在玩家没要求的情况下丢了"
// 用的,不是给"玩家自己选择重来"用的。
describe("重开之后不该再被追问", () => {
  it("刚重开的存档,flag 一定是 0 —— 这就是误报的来源", () => {
    const fresh = createInitialState();
    expect(Object.keys(fresh.flags).length).toBe(0);
  });

  it("而任何有进度的备份,flag 都大于 0", () => {
    // 两者相减必然为正,所以原来的判定对每一次重开都成立。
    const played = { ...createInitialState(), flags: { "act1.coldWake.cleared": true } };
    expect(Object.keys(played.flags).length).toBeGreaterThan(Object.keys(createInitialState().flags).length);
  });

  it("备份不能因为压掉提示就被删掉", () => {
    // 重开必须是可逆的。提示不再弹,但设置里的"找回之前的战役"要还能找到它。
    localStorage.clear();
    const played = { ...createInitialState(), flags: { "act1.coldWake.cleared": true } };
    saveGame(played);
    saveGame(createInitialState());   // 模拟"新的开始"
    expect(recoverableSave(), "重开之后备份没了,玩家再也回不去").not.toBeNull();
  });
});
