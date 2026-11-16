# 状态

## 已完成

- 解包并核对 Infinite Heaven r267 的 Lua 菜单结构。
- 提取 718 条菜单标签与 309 条帮助文本。
- 人工翻译写入 `InfChinese.lua` 的按模块中文表。
- 修正语言合并顺序，并修复 `GetLanguageCode` 对语言表的判断。
- IHHook 字体加载改为 Sarasa Gothic SC 与 CJK glyph range。
- 增加 GitHub Actions 构建、Lua 校验和 SnakeBite 打包脚本。

## 待完成

- 创建公开 GitHub 仓库并推送。
- 等待 GitHub Actions 构建成功。
- 下载制品并在 SnakeBite 中实机安装检查。

## 下一步

提交当前工作区并推送，然后运行：

`gh run watch --exit-status`
