const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storage: {
    // 旧的存储API
    selectDirectory: () => ipcRenderer.invoke('storage:selectDirectory'),
    getCurrentPath: () => ipcRenderer.invoke('storage:getCurrentPath'),
    resetToDefault: () => ipcRenderer.invoke('storage:resetToDefault'),
    saveNovels: (novelsData) => ipcRenderer.invoke('storage:saveNovels', novelsData),
    loadNovels: () => ipcRenderer.invoke('storage:loadNovels'),

    // 新的存储API - 小说元数据管理
    loadNovelMetadata: (novelId) => ipcRenderer.invoke('storage:loadNovelMetadata', novelId),
    saveNovelMetadata: (novelId, metadata) => ipcRenderer.invoke('storage:saveNovelMetadata', novelId, metadata),
    deleteNovel: (novelId) => ipcRenderer.invoke('storage:deleteNovel', novelId),

    // 章节索引管理
    loadChapterIndex: (novelId) => ipcRenderer.invoke('storage:loadChapterIndex', novelId),
    saveChapterIndex: (novelId, index) => ipcRenderer.invoke('storage:saveChapterIndex', novelId, index),

    // 章节数据管理
    loadChapter: (novelId, chapterId) => ipcRenderer.invoke('storage:loadChapter', novelId, chapterId),
    saveChapter: (novelId, chapter) => ipcRenderer.invoke('storage:saveChapter', novelId, chapter),
    deleteChapter: (novelId, chapterId) => ipcRenderer.invoke('storage:deleteChapter', novelId, chapterId),
    createChapter: (novelId, chapterData) => ipcRenderer.invoke('storage:createChapter', novelId, chapterData),

    // AI上下文管理
    loadAIContext: (novelId, chapterId) => ipcRenderer.invoke('storage:loadAIContext', novelId, chapterId),
    saveAIContext: (novelId, chapterId, context) => ipcRenderer.invoke('storage:saveAIContext', novelId, chapterId, context),
    needsNewSummary: (novelId, chapterId, content) => ipcRenderer.invoke('storage:needsNewSummary', novelId, chapterId, content),
    generateChapterSummary: (novelId, chapterId, content) => ipcRenderer.invoke('storage:generateChapterSummary', novelId, chapterId, content),
    generateFullBookSummary: (novelId) => ipcRenderer.invoke('storage:generateFullBookSummary', novelId),

    // 世界书管理
    loadWorldBook: (novelId) => ipcRenderer.invoke('storage:loadWorldBook', novelId),
    saveWorldBook: (novelId, worldBook) => ipcRenderer.invoke('storage:saveWorldBook', novelId, worldBook),

    // AI配置管理
    loadAIConfig: (novelId) => ipcRenderer.invoke('storage:loadAIConfig', novelId),
    saveAIConfig: (novelId, config) => ipcRenderer.invoke('storage:saveAIConfig', novelId, config)
  }
});