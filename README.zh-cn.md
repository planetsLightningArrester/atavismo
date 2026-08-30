# 👣 返祖现象

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">基于 <a href="https://www.electronjs.org/"><b>Electron.js</b></a> 与 <a href="https://svelte.dev/"><b>Svelte</b></a> 构建的高性能跨平台 GEDCOM 家谱浏览器与族谱探索器</h2>

# 目录

- [👣 返祖现象](#-返祖现象)
- [目录](#目录)
  - [✨ 功能特性](#-功能特性)
  - [🚀 使用指南](#-使用指南)
  - [💻 开发与构建](#-开发与构建)
    - [⚙️ 环境配置](#️-环境配置)
    - [🧪 测试与校验](#-测试与校验)
  - [📜 开源协议](#-开源协议)

## ✨ 功能特性

- **零外部依赖 GEDCOM 解析引擎**：纯 TypeScript 自研词法分析与 AST 构建，全面支持 GEDCOM 5.5 与 5.5.1 标准。
- **交互式家谱树可视化**：直观探索人物关系、配偶、长辈与子嗣分支。
- **实时全局搜索与过滤**：支持按姓名、姓氏、ID 即时检索数千条记录并按性别快速筛选。
- **详尽档案属性检查器**：展示生卒年限、生卒地点、结婚事件及多行人物传记备注。
- **多语言国际化支持**：原生支持简体中文 (`zh-CN`)、英语 (`en-US`)、葡萄牙语 (`pt-BR`) 及西班牙语 (`es-MX`)。
- **内置真实示例数据集**：自带 3,850+ 行真实家谱数据，一键即可开始体验。

## 🚀 使用指南

### 打开文件
- 将任何 `.ged`、`.gedcom` 或 `.txt` 文件直接拖放至程序窗口。
- 或点击顶部导航栏中的 **打开 GEDCOM 文件** 按钮选择文件。
- 点击 **加载示例家谱** 即可即时浏览内置家谱数据。

## 💻 开发与构建

### ⚙️ 环境配置

```bash
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo
npm run preinstall
npm run start
```

### 🧪 测试与校验

```bash
npm run lint
npm run build
npm run test
```

## 📜 开源协议

本项目基于 [GNU GPLv3](LICENSE) 协议开源。
