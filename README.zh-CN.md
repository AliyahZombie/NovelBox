# NovelBox

[English](./README.md) | [中文](./README.zh-CN.md)


**NovelBox - AI 驱动的小说写作助手**

NovelBox 旨在通过AI工具集成来辅助进行小说写作，目前NovelBox仍处于早期的开发阶段，功能上有许多的不完善之处，欢迎提交PR！

---

## ✨ 主要功能

*   **AI 集成**
    *   目前原生支持 **OpenAI** 和 **Google Gemini** 兼容的 API。
    *   采用可扩展架构，轻松添加新的 AI 服务。
    *   AI辅助的文本重写与故事续写功能。

*   **上下文管理器**
    *   上下文管理器会自动为每个章节生成内容摘要，为AI提供关键的上下文信息。告别前后矛盾的情节！现在，AI会记住关键事件和角色发展，确保你的故事从头到尾都保持一致性和连贯性。

*   **世界书**
    *   使用世界书功能配置你的世界背景，世界规则和人物设定，为AI基于您的故事进行创作时提供参考。

*   **小说编辑器**
    *   三栏式写作面板
    *   章节管理：支持拖拽排序、新增、编辑和删除章节。
    *   内容自动保存
    *   支持小说导出

*   **跨平台与定制化**
    *   基于 Electron+VueJS 构建
    *   i18n支持 目前已配置了中/英双语

## 🛠️ 技术栈

*   **[Electron](https://www.electronjs.org/)**: 桌面应用框架
*   **[Vue.js 3](https://vuejs.org/)**: 前端框架
*   **[Vite](https://vitejs.dev/)**: 前端构建工具
*   **[Pinia](https://pinia.vuejs.org/)**: 状态管理
*   **[Vue Router](https://router.vuejs.org/)**: 路由管理
*   **[Vue I18n](https://vue-i18n.intlify.dev/)**: 国际化

## 🚀 本地开发

**1. 克隆仓库**
```bash
git clone https://github.com/AliyahZombie/NovelBox
cd novelbox
```

**2. 安装依赖**
```bash
npm install
```

**3. 运行开发环境**
此命令会同时启动 Vite 开发服务器和 Electron 应用。
```bash
npm run dev
```

## 📦 构建

您可以为您的操作系统构建可执行文件。

**构建并打包应用**
```bash
npm run dist
```

构建后的文件将位于 `dist` 目录下。

## 📄 许可证

本项目采用 [AGPL-3.0](LICENSE) 许可证。