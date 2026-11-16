const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const repo = path.resolve(__dirname, "..");
const patches = path.join(repo, "patches", "infinite-heaven");
const modules = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules");
const required = [
  "InfChinese.lua",
  "InfLang.lua",
  "InfLangProc.lua",
  "Ivars.lua",
];

const failures = [];
for (const name of required) {
  const file = fs.existsSync(path.join(patches, name))
    ? path.join(patches, name)
    : path.join(modules, name);
  if (!fs.existsSync(file)) {
    failures.push(`${name}: missing`);
    continue;
  }
  try {
    luaparse.parse(fs.readFileSync(file, "utf8"), { luaVersion: "5.3", comments: false });
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const cn = fs.readFileSync(path.join(patches, "InfChinese.lua"), "utf8");
if (!cn.includes("this.modules")) failures.push("InfChinese.lua: no per-module tables");
if (!cn.includes("help={")) failures.push("InfChinese.lua: no help table");

const sourceKeys = JSON.parse(fs.readFileSync(path.join(repo, "language-keys.json"), "utf8"));
const runtimeNames = {
  "InfBossTppBossQuiet2.lua": {
    bossMenuName: "TppBossQuiet2_Menu",
    "this.ivarNames.enable": "TppBossQuiet2_enable",
    "MemberExpression.enable": "TppBossQuiet2_enable",
  },
  "InfBossTppParasite2.lua": {
    bossMenuName: "TppParasite2_Menu",
    "this.ivarNames.enable": "TppParasite2_enable",
    "MemberExpression.enable": "TppParasite2_enable",
  },
  "InfBossTppVolgin2.lua": {
    bossMenuName: "TppVolgin2_Menu",
    "this.ivarNames.enable": "TppVolgin2_enable",
    "MemberExpression.enable": "TppVolgin2_enable",
  },
};

const ast = luaparse.parse(cn, { luaVersion: "5.3", comments: false });
const modulesAssign = ast.body.find(
  (s) => s.type === "AssignmentStatement" && s.variables[0]?.identifier?.name === "modules"
);
const modulesTable = modulesAssign.init[0];
const translated = {};
for (const fileField of modulesTable.fields) {
  const file = fileField.key.raw ? JSON.parse(fileField.key.raw) : fileField.key.value;
  translated[file] = { eng: new Set(), help: new Set() };
  for (const kindField of fileField.value.fields) {
    const kind = kindField.key.name;
    for (const entry of kindField.value.fields) {
      translated[file][kind].add(entry.key.name || entry.key.value);
    }
  }
}

for (const [file, kinds] of Object.entries(sourceKeys)) {
  for (const kind of ["eng", "help"]) {
    for (const entry of kinds[kind] || []) {
      if (file === "InfLang.lua" && entry.key === "test") continue;
      const key = (runtimeNames[file] && runtimeNames[file][entry.key]) || entry.key;
      if (!translated[file] || !translated[file][kind].has(key)) {
        failures.push(`${file}: missing ${kind} translation for ${entry.key}`);
      }
    }
  }
}

const font = path.join(repo, "assets", "SarasaGothicSC-Regular.ttf");
if (!fs.existsSync(font)) failures.push("assets/SarasaGothicSC-Regular.ttf: missing");
else if (fs.statSync(font).size < 1000000) failures.push("assets/SarasaGothicSC-Regular.ttf: unexpectedly small");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("validation passed");
