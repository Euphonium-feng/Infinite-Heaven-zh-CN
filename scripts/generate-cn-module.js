const fs = require("fs");
const path = require("path");

const repo = path.resolve(__dirname, "..");
const merged = {};
for (const name of ["base-manual.json", "manual-extra.json"]) {
  const data = JSON.parse(fs.readFileSync(path.join(repo, "translations", name), "utf8"));
  for (const [file, values] of Object.entries(data)) {
    merged[file] = merged[file] || {};
    for (const kind of ["eng", "help"]) {
      if (!values[kind]) continue;
      merged[file][kind] = { ...(merged[file][kind] || {}), ...values[kind] };
    }
  }
}

const runtimeKeys = {
  "InfBossTppParasite2.lua": {
    bossMenuName: "TppParasite2_Menu",
    "MemberExpression.enable": "TppParasite2_enable",
    "this.ivarNames.enable": "TppParasite2_enable",
  },
  "InfBossTppBossQuiet2.lua": {
    bossMenuName: "TppBossQuiet2_Menu",
    "MemberExpression.enable": "TppBossQuiet2_enable",
    "this.ivarNames.enable": "TppBossQuiet2_enable",
  },
  "InfBossTppVolgin2.lua": {
    bossMenuName: "TppVolgin2_Menu",
    "MemberExpression.enable": "TppVolgin2_enable",
    "this.ivarNames.enable": "TppVolgin2_enable",
  },
};

function resolveRuntimeKey(file, key) {
  return (runtimeKeys[file] && runtimeKeys[file][key]) || key;
}

function luaKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${JSON.stringify(key)}]`;
}

function luaValue(value, indent) {
  if (Array.isArray(value)) {
    return "{" + value.map((item) => JSON.stringify(item)).join(",") + "}";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.entries(value)
        .map(([key, item]) => `${luaKey(key)}=${JSON.stringify(item)}`)
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function tableLines(entries, indent) {
  return Object.keys(entries)
    .sort()
    .map((key) => `${indent}${luaKey(key)}=${luaValue(entries[key])},`);
}

function sourceCount(file, data) {
  return Object.keys(data.eng || {}).length + Object.keys(data.help || {}).length;
}

const blocks = [];
blocks.push("-- InfChinese.lua");
blocks.push("-- Simplified Chinese menu translations (manual).");
blocks.push("-- Keys are grouped by their source module so same-named keys");
blocks.push("-- in different modules cannot overwrite each other.");
blocks.push("local this={}");
blocks.push("");
blocks.push("this.modules={");
for (const [file, data] of Object.entries(merged)) {
  const eng = data.eng || {};
  const help = data.help || {};
  if (!Object.keys(eng).length && !Object.keys(help).length) continue;
  blocks.push(`  ["${file}"]={`);
  if (Object.keys(eng).length) {
    blocks.push("    eng={");
    const resolved = {};
    for (const [key, value] of Object.entries(eng)) resolved[resolveRuntimeKey(file, key)] = value;
    blocks.push(...tableLines(resolved, "      "));
    blocks.push("    },");
  }
  if (Object.keys(help).length) {
    blocks.push("    help={");
    const resolved = {};
    for (const [key, value] of Object.entries(help)) resolved[resolveRuntimeKey(file, key)] = value;
    blocks.push(...tableLines(resolved, "      "));
    blocks.push("    },");
  }
  blocks.push("  },");
}
blocks.push("}");
blocks.push("");
blocks.push("return this");
blocks.push("");

fs.writeFileSync(
  path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules", "InfChinese.lua"),
  blocks.join("\n")
);
console.log("InfChinese.lua generated");
