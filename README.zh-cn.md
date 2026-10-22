# 👣 返祖现象 (Atavismo)

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">基于 <a href="https://www.electronjs.org/"><b>Electron.js</b></a> 与 <a href="https://svelte.dev/"><b>Svelte</b></a> 构建的高性能跨平台 GEDCOM 家谱浏览器与族谱探索器</h2>

# 目录

- [👣 返祖现象 (Atavismo)](#-返祖现象-atavismo)
- [目录](#目录)
  - [✨ 功能特性](#-功能特性)
  - [🚀 使用指南](#-使用指南)
  - [💻 开发与构建](#-开发与构建)
    - [⚙️ 环境配置](#️-环境配置)
    - [🧪 测试与性能基准](#-测试与性能基准)
  - [📜 开源协议](#-开源协议)

## ✨ 功能特性

- **零外部依赖 GEDCOM 解析引擎**：纯 TypeScript 自研词法分析与 AST 构建，全面支持 GEDCOM 5.5、5.5.1 与 7.0 标准（涵盖 `INDI`、`FAM`、`SOUR`、`REPO`、`OBJE`、`SUBM`、`QUAY` 文献可信度评级、`CONT`/`CONC` 多行备注及跨引用完整性诊断）。
- **交互式家谱树可视化 (D3.js / SVG)**：
  - 支持 **先祖系谱树**、**后代世系树**、**双向沙漏图**、**扇形圆环图（180° 半圆扇与 360° 全圆盘）** 及 **家庭核心单元**。
  - 支持平滑缩放与平移、世代深度调节、快速人物跳转，以及高分辨率 **SVG** 与 **PNG** 导出。
- **档案检查器、文献库与多媒体浏览器**：
  - **交互式生平时间线**：自动计算事件发生时的年龄、显示逝世原因及内联文献引用标签。
  - 内置 **来源文献 (`SOUR`)**、**档案馆藏 (`REPO`)** 与 **多媒体档案 (`OBJE`)** 专属浏览器，支持双向关联跳转。
  - **忽略重音符号与容错模糊搜索 (Fuzzy Search)**，并提供在世状态、出生年份区间、文献与多媒体高级筛选。
- **家谱统计分析与亲属关系计算器**：
  - **亲属关系路径与血缘计算器 (LCA)**：计算任意两人之间的血亲或姻亲关系、罗马法/寺院法亲等、预计共享 DNA 百分比、共同祖先及可视化关系链路。
  - **人口统计与迁徙走廊**：按性别统计平均寿命、最高寿记录、各历史时期出生与逝世双柱状图、逝世年龄段分布，以及跨地区 **人口迁徙走廊（出生地 → 迁入/逝世地）**。
- **多语言国际化支持**：原生支持简体中文 (`zh-CN`)、英语 (`en-US`)、葡萄牙语 (`pt-BR`) 及西班牙语 (`es-MX`)。
- **内置大型示例数据集**：自带 10,993 行真实感跨世代家谱数据（`sample.gedcom`，含 229 位人物、100 个家庭、跨越 7 个世代）。

## 🚀 使用指南

### 打开文件
- 将任何 `.ged`、`gedcom` 或 `.txt` 文件直接拖放至程序窗口。
- 或点击顶部导航栏中的 **打开 GEDCOM 文件** 按钮选择文件。
- 点击 **加载示例家谱** 即可即时浏览内置家谱数据。

## 💻 开发与构建

### ⚙️ 环境配置

```bash
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo
npm ci
npm run start
```

### 🧪 测试与性能基准

```bash
# 运行安全检查 (Electronegativity)、svelte-check 与 ESLint
npm run lint

# 构建前端与后端产物
npm run build

# 编译并运行全部单元测试与 Playwright 端到端测试
npm run test

# 复用已有后端编译产物直接运行测试
npm run test:run

# 运行全屏性能基准测试套件 (CPU / FPS / CDP 指标)
npm run test:perf
```

## 📜 开源协议

本项目基于 [GNU GPLv3](LICENSE) 协议开源。
