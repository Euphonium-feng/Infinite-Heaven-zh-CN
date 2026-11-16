# 决策

## 使用独立中文模块

选择新增 `InfChinese.lua`，在 `InfLangProc.PostAllModulesLoad` 中合并到 `cht`，而不是直接改写几十个模块的英文表。这样能保留上游模块结构，也便于逐项审查。

## 使用 Sarasa Gothic SC

用户明确指定 `SarasaGothicSC-Regular.ttf`，因此不采用系统微软雅黑、Noto 或其他字体。

## IHHook 字体范围

IHHook 原实现只加载拉丁字形。仅翻译文本会产生方块字，因此在字体加载处加入 CJK glyph range，并将中文字体限制为常用字号。字形范围从实际译文生成，避免整本 CJK 字形集带来的内存压力。

## 云构建

按项目要求，所有构建通过 GitHub Actions 完成；本地构建不作为验收依据。
