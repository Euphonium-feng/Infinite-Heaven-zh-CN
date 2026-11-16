# 状态

## 已完成

- 解包并核对 Infinite Heaven r267 的 Lua 菜单结构。
- 提取 718 条菜单标签与 309 条帮助文本。
- 人工翻译写入 `InfChinese.lua` 的按模块中文表。
- 修正语言合并顺序，并修复 `GetLanguageCode` 对语言表的判断。
- IHHook 字体加载改为 Sarasa Gothic SC 与 CJK glyph range。
- 增加 GitHub Actions 构建、Lua 校验和 SnakeBite 打包脚本。

## 已完成（云端）

- GitHub Actions 运行 `43902070199` 全部步骤通过。
- 云端已生成并上传 `Infinite-Heaven-r267-zh-CN.mgsv` 与 `IHHook-r25-zh-CN.mgsv`。
- 已下载制品并核对：两个包的 `FileEntries` 均与实体文件哈希一致；IHHook 包已登记 `dinput8.dll`、配置、样式与字体。

## 待完成

- 由用户在 SnakeBite 中实机安装检查中文菜单显示、字体和切换项。

## 下一步

下载最新绿色运行的制品，安装后检查中文菜单显示与切换项。
