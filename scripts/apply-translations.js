const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const repo = path.resolve(__dirname, "..");
const modulesDir = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules");

const translations = {};

function read(file) {
  return fs.readFileSync(path.join(repo, "translations", file), "utf8");
}

// Each translation file is tab-separated: file, key, kind, original, translation.
for (const name of fs.readdirSync(path.join(repo, "translations")).filter((f) => f.endsWith(".tsv"))) {
  for (const rawLine of read(name).split(/\r?\n/)) {
    const line = rawLine.trimStart();
    if (!line || line.startsWith("#")) continue;
    const [file, key, kind, original, translation] = rawLine.split("\t");
    if (!file || !key || !kind || translation === undefined) {
      throw new Error(`Malformed translation row in ${name}: ${rawLine}`);
    }
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
    const key = field.key;
    if (key.type === "StringLiteral") return decodeLuaString(key.raw);
    if (key.type === "Identifier") return key.name;
    if (key.type === "MemberExpression") return memberPath(key);
  }
  return null;
}

function decodeLuaString(raw) {
  if (raw.startsWith("[[")) return raw.slice(2, raw.lastIndexOf("]]"));
  return JSON.parse(raw.slice(1, -1).replace(/\\'/g, "'"));
}

function luaKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `[${JSON.stringify(key)}]`;
}

function luaString(text) {
  return JSON.stringify(text).replace(/\\u2028/g, "\\n").replace(/\\u2029/g, "\\n");
}

// Locate the line of the closing brace for a table starting at a given line.
function findTableEnd(lines, startLine) {
  let depth = 0;
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = stripLuaComment(lines[i]);
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  throw new Error(`Could not find table end at line ${startLine}`);
}

function stripLuaComment(line) {
  const comment = line.indexOf("--");
  return comment >= 0 ? line.slice(0, comment) : line;
}

let written = 0;
let unmatched = [];

for (const [file, kinds] of Object.entries(translations)) {
  const filePath = path.join(modulesDir, file);
  if (!fs.existsSync(filePath)) {
    unmatched.push(`${file} (missing file)`);
    continue;
  }
  const source = fs.readFileSync(filePath, "utf8");
  const ast = luaparse.parse(source, { luaVersion: "5.3", comments: false });
  const lines = source.split("\n");
  const inserts = [];

  for (const statement of ast.body) {
    if (statement.type !== "AssignmentStatement") continue;
    const target = statement.variables[0];
    if (!target) continue;
    const pathText = memberPath(target);
    if (pathText === "this.langStrings") {
      const table = statement.init[0];
      const eng = table.fields.find((f) => f.type === "TableKeyString" && f.key.name === "eng");
      const help = table.fields.find((f) => f.type === "TableKeyString" && f.key.name === "help");
      if (eng) {
        inserts.push({ line: findTableEnd(lines, eng.value.loc.start.line), kind: "eng", table: eng.value, indent: "    " });
      }
      if (help) {
        const helpEng = help.value.fields.find((f) => f.type === "TableKeyString" && f.key.name === "eng");
        if (helpEng) {
          inserts.push({ line: findTableEnd(lines, helpEng.value.loc.start.line), kind: "help", table: helpEng.value, indent: "      " });
        }
      }
    } else if (pathText === "this.help.eng") {
      inserts.push({ line: findTableEnd(lines, statement.loc.start.line), kind: "help", table: statement.init[0], indent: "  " });
    }
  }

  const additions = [];
  for (const insert of inserts) {
    const values = kinds[insert.kind] || {};
    if (!Object.keys(values).length) continue;
    const existing = new Set(insert.table.fields.map((f) => keyName(f)));
    const newLines = [];
    for (const [key, item] of Object.entries(values)) {
      if (!existing.has(key)) {
        unmatched.push(`${file}:${key} (not in ${insert.kind})`);
        continue;
      }
      newLines.push(`${insert.indent}${luaKey(key)}=${luaString(item.translation)},`);
    }
    if (newLines.length) additions.push({ line: insert.line, lines: newLines });
  }

  if (!additions.length) continue;
  additions.sort((a, b) => b.line - a.line);
  for (const addition of additions) {
    lines.splice(addition.line, 0, ...addition.lines);
  }
  fs.writeFileSync(filePath, lines.join("\n"));
  written++;
}

console.log(JSON.stringify({ written, unmatched }, null, 2));
