import { describe, expect, it } from "vitest";

/** SVG 属性名区分大小写,而 Preact **不做** React 那样的驼峰转换。
 *
 * 2026-08-31 实测(/loop 第 20 轮)。在页面里做的对照实验:
 *
 *     setAttribute("stroke-width", "4")  → 计算值 4px
 *     setAttribute("strokeWidth",  "4")  → 计算值 1px   ← 被静默忽略
 *
 * 而当时代码库里写的全是驼峰,共 146 处:
 *
 *     79 strokeWidth   32 strokeLinejoin   23 strokeLinecap
 *      4 stopColor      2 strokeDasharray   2 stopOpacity
 *      1 textAnchor     1 strokeOpacity     1 fontSize / fontFamily
 *
 * 后果不是崩溃,是**全部按默认值画**:每个图标 1px 发丝线、平头、尖角;星图的
 * 航线本该是 4px 辉光 + 1.5px 虚线,画出来是两条一样的 1px 实线;星系名本该
 * 居中在行星下方,实际靠左偏了半个标签。
 *
 * 这种 bug 不会报错、不会有测试失败、看截图也只觉得"有点素",所以能活很久。
 * 这条测试直接扫源码——它查的是写法,不需要渲染。 */

const CAMEL_SVG_ATTRS = [
  "strokeWidth", "strokeDasharray", "strokeDashoffset", "strokeOpacity",
  "strokeLinecap", "strokeLinejoin", "strokeMiterlimit",
  "fillOpacity", "fillRule", "clipRule",
  "textAnchor", "dominantBaseline", "letterSpacing",
  "stopColor", "stopOpacity",
  "floodColor", "floodOpacity",
  "markerEnd", "markerStart", "paintOrder", "vectorEffect", "shapeRendering",
];

/** 整个 src 下的 tsx 源码。用 Vite 的 glob 而不是 node:fs——这个工程没装
 * @types/node,而且和其它结构性测试保持同一种读法。 */
const SOURCES = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("SVG 属性必须用连字符名", () => {
  it("源码里没有驼峰写法的 SVG 表现属性", () => {
    const offenders: string[] = [];
    const files = Object.keys(SOURCES);
    expect(files.length, "一个 tsx 源文件都没读到,这条测试就是永远为真的").toBeGreaterThan(10);
    for (const file of files) {
      SOURCES[file].split("\n").forEach((line: string, i: number) => {
        for (const attr of CAMEL_SVG_ATTRS) {
          // JSX 属性位置:标识符紧跟 =。前面不能是字母/点,免得撞到 style 对象里的
          // 同名 CSS 属性(那些在 style={{}} 里是对的,不能改)。
          if (new RegExp(`(?<![\\w.])${attr}=`).test(line)) {
            offenders.push(`${file}:${i + 1}  ${attr} → ${attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`);
          }
        }
      });
    }
    expect(
      offenders,
      `Preact 不转换驼峰,这些属性会被浏览器直接忽略(按默认值画):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
