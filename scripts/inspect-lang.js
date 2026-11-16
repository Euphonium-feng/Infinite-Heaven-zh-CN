const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");

const root = path.resolve(
  __dirname,
  "..",
  "vendor",
  "infinite-heaven",
  "GameDir",
  "mod",
  "modules"
);

function fieldKey(field) {
  if (!field) return null;
  if (field.type === "TableKeyString") return field.key.name;
  if (field.type === "Identifier") return field.name;
  if (field.type === "StringLiteral") return field.value;
  return null;
}

function tableFields(node) {
  return node && node.type === "TableConstructorExpression" ? node.fields || [] : [];
}

function tableEntry(table, key) {
  return tableFields(table).find(
    (field) => field.type === "TableKeyString" && field.key.name === key
  );
}

function lookupKeyText(field) {
  if (!field) return null;
  if (field.type === "TableKeyString") return field.key.name;
  if (field.type === "TableKey") {
    const key = field.key;
    if (key.type === "StringLiteral") return key.value;
    if (key.type === "Identifier") return key.name;
    if (key.type === "MemberExpression") {
      return (key.base.name || key.base.type) + "." + (key.identifier.name || key.identifier.type);
    }
    return key.type;
  }
  return null;
}

function unwrapAssignment(node) {
  if (node && node.type === "AssignmentStatement") return node.init && node.init[0];
  return node;
}

function stringValue(node) {
  if (typeof node === "string") return node;
  if (!node) return null;
  if (node.type === "StringLiteral") {
    if (typeof node.value === "string") return node.value;
    if (typeof node.raw === "string") {
      try {
        return JSON.parse(node.raw);
      } catch {
        return node.raw.replace(/^(['"])(.*)\1$/s, "$2");
      }
    }
    return null;
  }
  if (node.type === "LongStringLiteral") {
    return node.value !== undefined ? node.value : node.raw;
  }
  if (node.type === "TableConstructorExpression") {
    return tableFields(node).map((field) => stringValue(field.value));
  }
  return null;
}

function scanFile(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const ast = luaparse.parse(source, { luaVersion: "5.3", comments: false });
  const result = { eng: [], help: [] };
  for (const statement of ast.body) {
    if (statement.type !== "AssignmentStatement") continue;
    const target = statement.variables && statement.variables[0];
    if (!target || target.type !== "MemberExpression") continue;
    const path = memberPath(target);
    if (path === "this.langStrings") {
      const table = statement.init[0];
      const eng = tableEntry(table, "eng");
      const help = tableEntry(table, "help");
      const helpEng = help ? tableEntry(unwrapAssignment(help.value) || help.value, "eng") : null;
      collect(result.eng, eng && eng.value);
      collect(result.help, helpEng && helpEng.value);
    } else if (path === "this.langStrings.eng") {
      collect(result.eng, statement.init[0]);
    } else if (path === "this.help.eng" || path === "this.help.eng.help") {
      collect(result.help, statement.init[0]);
    } else if (path === "this.help.eng.help") {
      collect(result.help, statement.init[0]);
    } else if (path === "this.eng") {
      collect(result.eng, statement.init[0]);
    } else if (path === "this.help") {
      for (const helpField of tableFields(statement.init[0])) {
        if (helpField.type !== "TableKeyString" || helpField.key.name !== "eng") continue;
        collect(result.help, helpField.value);
      }
    }
  }
  return result;
}

function memberPath(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") {
    return memberPath(node.base) + "." + (node.identifier.type === "Identifier" ? node.identifier.name : node.identifier.value);
  }
  return node.type;
}

function collect(output, table) {
  for (const field of tableFields(table)) {
    output.push({
      key: lookupKeyText(field),
      value: stringValue(field.value),
      line: field.loc ? field.loc.start.line : null,
    });
  }
}

function scanFileLegacy(file) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const ast = luaparse.parse(source, { luaVersion: "5.3", comments: false });
  const result = { eng: [], help: [] };
  for (const statement of ast.body) {
    if (statement.type !== "AssignmentStatement") continue;
    const target = statement.variables && statement.variables[0];
    if (!target || target.type !== "MemberExpression") continue;
    if (memberPath(target) !== "this.langStrings") continue;
    const table = statement.init[0];
    const eng = tableEntry(table, "eng");
    const help = tableEntry(table, "help");
    const helpEng = help ? tableEntry(unwrapAssignment(help.value) || help.value, "eng") : null;
    for (const field of tableFields(eng && eng.value)) {
      result.eng.push({
        key: lookupKeyText(field),
        value: stringValue(field.value || field.value === "" ? field.value : null),
        line: field.loc ? field.loc.start.line : null,
      });
    }
    for (const field of tableFields(helpEng && helpEng.value)) {
      result.help.push({
        key: lookupKeyText(field),
        value: stringValue(field.value),
        line: field.loc ? field.loc.start.line : null,
      });
    }
  }
  return result;
}

const files = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".lua"))
  .sort();
const modules = {};
let engCount = 0;
let helpCount = 0;
for (const file of files) {
  const found = scanFile(file);
  if (found.eng.length || found.help.length) {
    modules[file] = found;
    engCount += found.eng.length;
    helpCount += found.help.length;
  }
}

const report = {
  summary: { files: Object.keys(modules).length, eng: engCount, help: helpCount },
  modules,
};
fs.writeFileSync(
  path.resolve(__dirname, "..", "extracted-lang.json"),
  JSON.stringify(report, null, 2)
);
process.stdout.write(JSON.stringify(report.summary, null, 2) + "\n");
