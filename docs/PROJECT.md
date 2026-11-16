# 项目目标

为 Metal Gear Solid V: The Phantom Pain 的 Infinite Heaven r267 提供简体中文菜单。

## 范围

- 翻译 Infinite Heaven 的菜单标签和帮助文本。
- 使用用户指定的 `SarasaGothicSC-Regular.ttf`。
- 让 IHHook 的 Dear ImGui 菜单加载中文字形。
- 通过 GitHub Actions 构建并生成可下载的 `.mgsv` 安装包。

## 验收

- 中文语言表覆盖全部源菜单键，无遗漏、无重复覆盖。
- IHHook 编译成功，工作流运行结论为成功。
- 生成的安装包可被 SnakeBite 识别。
- 游戏内显示效果需由用户实机验证；云端构建不等同于视觉验收。

## 非目标

- 翻译游戏本体文本。
- 修改 Infinite Heaven 的玩法逻辑。
- 在没有用户明确同意时安装到游戏目录。
