const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const repo = path.resolve(__dirname, "..");
const modulesDir = path.join(repo, "vendor", "infinite-heaven", "GameDir", "mod", "modules");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function parse(file) {
  return luaparse.parse(read(file), { luaVersion: "5.3", comments: false });
}

function tableFields(node) {
  return node && node.type === "TableConstructorExpression" ? node.fields || [] : [];
}

function tableEntry(table, key) {
  return tableFields(table).find(
    (field) => field.type === "TableKeyString" && field.key.name === key
  );
}

function stringValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") {
    if (typeof node.value === "string") return node.value;
    return decodeLuaString(node.raw);
  }
  if (node.type === "TableConstructorExpression") {
    return tableFields(node).map((field) => stringValue(field.value));
  }
  return null;
}

function decodeLuaString(raw) {
  if (raw.startsWith("[[")) {
    return raw.slice(2, raw.lastIndexOf("]]"));
  }
  const quote = raw[0];
  let body = raw.slice(1, -1);
  return body.replace(
    /\\(x[0-9a-fA-F]{2}|[0-7]{1,3}|[abfnrtv\\"']|\r?\n)/g,
    (match, escape) => {
      if (escape === "n") return "\n";
      if (escape === "r") return "\r";
      if (escape === "t") return "\t";
      if (escape === "\\") return "\\";
      if (escape === "\n" || escape === "\r\n") return "\n";
      if (escape.startsWith("x")) return String.fromCharCode(parseInt(escape.slice(1), 16));
      if (/^[0-7]+$/.test(escape)) return String.fromCharCode(parseInt(escape, 8));
      return escape;
    }
  );
}

function entryValue(node) {
  if (!node) return null;
  if (node.type === "StringLiteral") return node.raw;
  if (node.type === "TableConstructorExpression") {
    return tableFields(node).map((field) => entryValue(field.value));
  }
  return null;
}

const files = fs.readdirSync(modulesDir).filter((name) => name.endsWith(".lua")).sort();
const keys = {};
for (const file of files) {
  const ast = parse(path.join(modulesDir, file));
  const eng = [];
  const help = [];
  for (const statement of ast.body) {
    if (statement.type !== "AssignmentStatement") continue;
    const target = statement.variables[0];
    if (!target || target.type !== "MemberExpression") continue;
    const pathText = memberPath(target);
    if (pathText === "this.langStrings") {
      const table = statement.init[0];
      const engEntry = tableEntry(table, "eng");
      const helpEntry = tableEntry(table, "help");
      const helpEng = helpEntry
        ? tableEntry(helpEntry.value, "eng") || tableEntry(helpEntry.value, "help")
        : null;
      for (const field of tableFields(engEntry && engEntry.value)) {
        eng.push({ key: keyName(field), raw: entryValue(field.value) });
      }
      for (const field of tableFields(helpEng && helpEng.value)) {
        help.push({ key: keyName(field), raw: entryValue(field.value) });
      }
    } else if (pathText === "this.help.eng") {
      for (const field of tableFields(statement.init[0])) {
        help.push({ key: keyName(field), raw: entryValue(field.value) });
      }
    } else if (pathText === "this.eng") {
      for (const field of tableFields(statement.init[0])) {
        eng.push({ key: keyName(field), raw: entryValue(field.value) });
      }
    }
  }
  if (eng.length || help.length) keys[file] = { eng, help };
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

fs.writeFileSync(
  path.join(repo, "language-keys.json"),
  JSON.stringify(keys, null, 2)
);

let total = 0;
for (const file of Object.keys(keys)) total += keys[file].eng.length + keys[file].help.length;
console.log(`${Object.keys(keys).length} files, ${total} entries`);
