import { describe, expect, it, beforeEach } from "vitest";
import { assignCrew, adjustAssignedCrewApproval, recruitGenericCrew, replaceState, state, flagship } from "./store";
import { createInitialState } from "../engine/save";
import CREW_SRC from "../ui/screens/Crew.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 没上岗的船员,支持度是**冻住**的——而界面上没说。
 *
 * 2026-08-31(/loop 第 40 轮)。两件事叠在一起:
 *
 *   recruitGenericCrew 建出来的船员是 assignedShipId: null
 *   adjustAssignedCrewApproval 只动 assignedShipId 匹配旗舰的那些人
 *
 * 所以新招的人打赢多少场,支持度都停在 50。而**第 36 轮起支持度决定了所有被动的
 * 强度**(0.5x–1.5x),于是"这个数为什么一直不动"变成一个玩家自己看不出答案的问题。
 *
 * 指派本身是个真选择——每个岗位只站一人,assignCrew 会把同岗位的另一个人挤下去
 * ——所以不能自动指派了事。该做的是把规则说出来。 */

describe("上岗与支持度", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("新招的船员默认没上岗", () => {
    recruitGenericCrew("recruitTactician");
    expect(state.value.crew[0].assignedShipId, "招募时就自动上岗了,那指派就没有取舍").toBeNull();
  });

  it("没上岗的人,打赢多少场支持度都不动", () => {
    recruitGenericCrew("recruitTactician");
    const before = state.value.crew[0].approval;
    for (let i = 0; i < 10; i++) adjustAssignedCrewApproval(2);
    expect(state.value.crew[0].approval, "没上岗却涨了支持度").toBe(before);
  });

  it("上岗之后才会涨", () => {
    recruitGenericCrew("recruitTactician");
    assignCrew(state.value.crew[0].id, flagship.value!.id);
    const before = state.value.crew[0].approval;
    adjustAssignedCrewApproval(5);
    expect(state.value.crew[0].approval, "上了岗还是不动").toBeGreaterThan(before);
  });

  it("同一个岗位只站一人——后来的把先来的挤下去", () => {
    recruitGenericCrew("recruitTactician");
    recruitGenericCrew("recruitTactician");
    const [a, b] = state.value.crew;
    assignCrew(a.id, flagship.value!.id);
    assignCrew(b.id, flagship.value!.id);
    const now = state.value.crew;
    expect(now.find((c) => c.id === b.id)!.assignedShipId).toBe(flagship.value!.id);
    expect(now.find((c) => c.id === a.id)!.assignedShipId, "同岗位站了两个人").toBeNull();
  });

  it("船员的文案不能替他们指定性别", () => {
    // 中文那条原来是「**他**站{faction}那边——你在那边做的事,**他**都知道」,
    // 而名单里有普莉雅、薇拉、柳芸,还有一个机械单元「七号安魂」。英文用的是
    // 中性的 them,中文却写死了他。改成不带人称代词的写法。
    const zh = STRINGS_SRC.slice(STRINGS_SRC.indexOf('const ZH: StringTable = {'));
    const line = zh.match(/"crew\.allegiance": "([^"]*)"/)?.[1] ?? "";
    expect(line, "找不到中文的 crew.allegiance").toBeTruthy();
    expect(line, "船员文案用了「他」——名单里有女性角色和一个机械单元").not.toMatch(/[他她它]/);
  });

  it("界面上必须说明「没上岗的支持度不会动」", () => {
    expect(
      CREW_SRC,
      "船员面板显示着支持度和它的倍率,却不说没上岗的人这个数永远不动",
    ).toMatch(/crew\.approvalFrozen/);
  });
});
