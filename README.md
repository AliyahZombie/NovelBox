# NovelBox

[English](./README.md) | [中文](./README.zh-CN.md)


**NovelBox - AI-powered Novel Writing Assistant**

NovelBox aims to assist in novel writing through the integration of AI tools. Currently, NovelBox is in its early stages of development with many features still incomplete. Pull requests are welcome!

---

## ✨ Key Features

*   **AI Integration**
    *   Natively supports **OpenAI** and **Google Gemini** compatible APIs.
    *   Built with an extensible architecture, making it easy to add new AI services.
    *   AI-powered functions including rewrite, continue writing, and summary generation.

*   **Context Manager**
    * Context Manager automatically summarizes each chapter, feeding the AI crucial context. Say goodbye to plots that go astray! The AI will now remember key events and character arcs, ensuring your story stays consistent and coherent.

*   **World Book**
    *   Use World Book to store your world background, rule sand character profiles to provide references for AI while generating content based on your story.


*   **Novel Editor**
    *   Three-column writing panel.
    *   Chapter management: Supports drag-and-drop sorting, adding, editing, and deleting chapters.
    *   Automatic content saving.
    *   Supports exporting novels.

*   **Cross-platform & Customization**
    *   Built with Electron + VueJS.
    *   i18n support, currently configured for Chinese and English.

## 🛠️ Tech Stack

*   **[Electron](https://www.electronjs.org/)**: Desktop application framework
*   **[Vue.js 3](https://vuejs.org/)**: Frontend framework
*   **[Vite](https://vitejs.dev/)**: Frontend build tool
*   **[Pinia](https://pinia.vuejs.org/)**: State management
*   **[Vue Router](https://router.vuejs.org/)**: Routing management
*   **[Vue I18n](https://vue-i18n.intlify.dev/)**: Internationalization

## 🚀 Local Development

**1. Clone the repository**
```bash
git clone https://github.com/AliyahZombie/NovelBox
cd novelbox
```

**2. Install dependencies**
```bash
npm install
```

**3. Run the development environment**
This command starts both the Vite development server and the Electron application.
```bash
npm run dev
```

## 📦 Build

You can build an executable for your operating system.

**Build and package the application**
```bash
npm run dist
```

The built files will be located in the `dist` directory.

## 📄 License

This project is licensed under the [AGPL-3.0](LICENSE) license.