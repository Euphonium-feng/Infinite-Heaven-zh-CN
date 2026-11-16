const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const repo = path.resolve(__dirname, "..");
const langPath = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules", "InfLang.lua");
const tsvPath = path.join(repo, "translations", "ui.tsv");

const rows = fs
  .readFileSync(tsvPath, "utf8")
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith("#"))
  .map((line) => {
    const [file, key, kind, original, translation] = line.split("\t");
    return { file, key, kind, original, translation };
  });

const eng = {};
const help = {};
for (const row of rows) {
  if (row.kind === "eng") eng[row.key] = row.translation;
  if (row.kind === "help") help[row.key] = row.translation;
}
help.simple_help = "浏览菜单：方向键或十字键。\n激活或切换设置：按右键、十字键或双击选项。\n";
help.generalHelpItem =
  "通用帮助：\n" +
  "按 F2 切换鼠标指针。\n" +
  "浏览菜单：方向键或十字键。\n" +
  "激活或切换设置：按右键、十字键或双击菜单选项。\n" +
  "搜索设置：点击菜单列表下方的设置文本，输入后按回车。\n" +
  "修改数值设置：点击菜单列表下方的设置值，输入后按回车。\n" +
  "菜单标记：\n" +
  "`>` 子菜单\n" +
  "`>>` 命令\n" +
  "`>]` 执行后关闭菜单的命令\n" +
  "`<>` 切换设置时立即生效的选项\n" +
  "`>!` 按 [操作] 执行动作的选项\n" +
  "部分设置只在被选中时生效，或要等触发其他命令、任务加载时才应用。\n" +
  "详情请参阅 ReadMe 或 Features and Options。\n";

function luaString(text) {
  return JSON.stringify(text);
}

function luaKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${luaString(key)}]`;
}

let source = fs.readFileSync(langPath, "utf8");
const lines = source.split("\n");

const engStart = lines.findIndex((line) => /^this\.cht=/.test(line));
const helpStart = lines.findIndex((line) => /^this\.help\.cht=/.test(line));
if (engStart < 0 || helpStart < 0) throw new Error("Could not find cht tables");

// Replace the two blocks with generated tables.
function findEnd(start) {
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].replace(/--.*$/, "");
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  throw new Error(`No table end after line ${start}`);
}

const engEnd = findEnd(engStart);
const helpEnd = findEnd(helpStart);

const engLines = [
  "this.cht={--Simplified Chinese menu translation",
  ...Object.entries(eng)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${luaKey(key)}=${luaString(value)},`),
  "}",
];

const helpLines = [
  "this.help.cht={",
  ...Object.entries(help)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${luaKey(key)}=${luaString(value)},`),
  "}",
];

const result = [
  ...lines.slice(0, Math.min(engStart, helpStart)),
  ...(engStart < helpStart
    ? [...engLines, ...lines.slice(engEnd + 1, helpStart), ...helpLines, ...lines.slice(helpEnd + 1)]
    : [...helpLines, ...lines.slice(helpEnd + 1, engStart), ...engLines, ...lines.slice(engEnd + 1)]),
].join("\n");

luaparse.parse(result, { luaVersion: "5.3", comments: false });
fs.writeFileSync(langPath, result);
console.log(`Generated ${Object.keys(eng).length} labels and ${Object.keys(help).length} help strings.`);
