const fs = require("fs");
const path = require("path");

const repo = path.resolve(__dirname, "..");
const langPath = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules", "InfChinese.lua");
const source = fs.readFileSync(langPath, "utf8");

const codepoints = new Set();
for (const char of source) {
  const cp = char.codePointAt(0);
  if (cp >= 0x80) codepoints.add(cp);
}

const sorted = [...codepoints].sort((a, b) => a - b);
const ranges = [];
for (const cp of sorted) {
  if (!ranges.length || cp > ranges[ranges.length - 1][1] + 1) {
    ranges.push([cp, cp]);
  } else {
    ranges[ranges.length - 1][1] = cp;
  }
}

const lines = [
  "// Generated from InfChinese.lua: do not edit by hand.",
  "static const ImWchar g_cnGlyphRanges[] = {",
  "    0x0020, 0x00FF,",
  ...ranges.map(([lo, hi]) => `    0x${lo.toString(16)}, 0x${hi.toString(16)},`),
  "    0,",
  "};",
];

fs.writeFileSync(path.join(repo, "patches", "ihhook", "ChineseGlyphRanges.h"), lines.join("\n") + "\n");
console.log(`${sorted.length} codepoints, ${ranges.length} ranges`);
