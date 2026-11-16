const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const repo = path.resolve(__dirname, "..");
const modulesDir = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules");
const langPath = path.join(modulesDir, "InfLang.lua");

const translations = {};
for (const name of fs.readdirSync(path.join(repo, "translations")).filter((f) => f.endsWith(".tsv"))) {
  for (const rawLine of fs.readFileSync(path.join(repo, "translations", name), "utf8").split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.startsWith("#")) continue;
    const [file, key, kind, original, translation] = rawLine.split("\t");
    if (!file || !key || !kind || translation === undefined) throw new Error(`Bad row: ${rawLine}`);
    translations[file] = translations[file] || { eng: {}, help: {} };
    translations[file][kind][key] = { original, translation };
  }
}

function memberPath(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") {
    return memberPath(node.base) + "." + (node.identifier.type === "Identifier" ? node.identifier.name : node.identifier.value);
  }
  return node.type;
}

function keyName(field) {
  if (field.type === "TableKeyString") return field.key.name;
  if (field.type === "TableKey") {
    if (field.key.type === "StringLiteral") return JSON.parse(field.key.raw);
    if (field.key.type === "Identifier") return field.key.name;
    if (field.key.type === "MemberExpression") return memberPath(field.key);
  }
  return null;
}

function fields(node) {
  return node && node.type === "TableConstructorExpression" ? node.fields || [] : [];
}

function tableEntry(table, key) {
  return fields(table).find((f) => f.type === "TableKeyString" && f.key.name === key);
}

function rawString(node) {
  return node.type === "StringLiteral" ? node.raw : null;
}

const errors = [];
let checked = 0;
for (const [file, kinds] of Object.entries(translations)) {
  const source = fs.readFileSync(path.join(modulesDir, file), "utf8");
  const ast = luaparse.parse(source, { luaVersion: "5.3", comments: false });
  for (const statement of ast.body) {
    if (statement.type !== "AssignmentStatement") continue;
    const target = statement.variables[0];
    if (!target) continue;
    const pathText = memberPath(target);
    let engTable = null;
    let helpTable = null;
    if (pathText === "this.langStrings") {
      const table = statement.init[0];
      engTable = tableEntry(table, "eng")?.value;
      const help = tableEntry(table, "help");
      helpTable = help ? tableEntry(help.value, "eng")?.value : null;
    } else if (pathText === "this.help.eng") {
      helpTable = statement.init[0];
    }
    for (const [key, item] of Object.entries(kinds.eng || {})) {
      if (!engTable) continue;
      if (!fields(engTable).some((f) => keyName(f) === key)) {
        errors.push(`${file}:${key}; missing English key`);
      }
    }
    for (const [key, item] of Object.entries(kinds.help || {})) {
      if (!helpTable) continue;
      if (!fields(helpTable).some((f) => keyName(f) === key)) {
        errors.push(`${file}:${key}; missing help key`);
      }
    }
  }
  checked += Object.keys(kinds.eng || {}).length + Object.keys(kinds.help || {}).length;
}

const cnSource = fs.readFileSync(langPath, "utf8");
const cnAst = luaparse.parse(cnSource, { luaVersion: "5.3", comments: false });
const cht = cnAst.body.find(
  (s) => s.type === "AssignmentStatement" && s.variables[0]?.type === "MemberExpression" && memberPath(s.variables[0]) === "this.cht"
);
const helpCht = cnAst.body.find(
  (s) => s.type === "AssignmentStatement" && s.variables[0]?.type === "MemberExpression" && memberPath(s.variables[0]) === "this.help.cht"
);
const chtKeys = new Set(fields(cht?.init[0]).map(keyName));
const helpChtKeys = new Set(fields(helpCht?.init[0]).map(keyName));

for (const [file, kinds] of Object.entries(translations)) {
  for (const key of Object.keys(kinds.eng || {})) {
    if (!chtKeys.has(key)) errors.push(`${file}:${key}; missing this.cht translation`);
  }
  for (const key of Object.keys(kinds.help || {})) {
    if (!helpChtKeys.has(key)) errors.push(`${file}:${key}; missing this.help.cht translation`);
  }
}

console.log(JSON.stringify({ checked, cht: chtKeys.size, helpCht: helpChtKeys.size, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
