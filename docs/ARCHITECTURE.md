# 架构

## Infinite Heaven

- `vendor/infinite-heaven/GameDir/mod/modules` 保存 Mod 的 Lua 模块。
- `InfLang.lua` 提供内置语言表。
- `InfLangProc.lua` 负责选择语言、合并模块语言表，并在加载后应用设置名称。
- `InfChinese.lua` 保存本次新增的完整简体中文覆盖表。
- `metadata.xml` 描述 SnakeBite 包中的文件与哈希。

## IHHook

- `vendor/ihhook/IHHook/StyleEditor.cpp` 负责加载 `mod\fonts` 中的 TTF。
- `SarasaGothicSC-Regular.ttf` 被识别为 CJK 字体，使用 `ChineseGlyphRanges.h` 中由实际译文生成的精确字形范围。
- 中文只烘焙常用字号，避免完整 CJK 字形集在 9 个字号下过度占用内存。

## 构建

`.github/workflows/build.yml` 在 Windows runner 上：

1. `npm ci`
2. 运行 `scripts/validate.js`
3. 用 MSBuild 编译 IHHook
4. 用 `tools/package.ps1` 生成两个 `.mgsv`
5. 上传制品

仓库不保存上游完整安装包；`tools/prepare-vendor.ps1` 在构建时拉取 r267 与 IHHook 源码，再叠加 `patches/`。

## 密钥与路径

构建不依赖本机路径或私有凭据。字体从仓库 `assets/` 读取。
