# Infinite Heaven 简体中文菜单

Infinite Heaven r267 的简体中文菜单翻译，附带能够显示中文的 IHHook 构建。

## 内容

- Infinite Heaven 菜单标签与帮助文本的中文翻译
- 使用 Sarasa Gothic SC 作为中文界面字体
- IHHook 中文 glyph range 支持

## 构建

仓库只保存翻译、补丁和构建脚本，不重复分发上游整包。推送后由 GitHub Actions 构建：

1. 下载官方 Infinite Heaven r267 发行包
2. 检出 IHHook 源码并应用字体补丁
3. 校验 Lua 翻译表
4. 编译 IHHook
5. 生成 `Infinite-Heaven-r267-zh-CN.mgsv` 与 `IHHook-r25-zh-CN.mgsv`

本仓库不包含游戏本体或原始 Mod 安装包。
