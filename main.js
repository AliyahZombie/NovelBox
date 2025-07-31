const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const process = require('process');

// 导入新的存储服务
let NovelStorageService;
let storageServiceInitialized = false;

async function initializeStorageService() {
  if (!storageServiceInitialized) {
    try {
      console.log('Initializing storage service...');
      const module = await import('./src/services/storage.js');
      NovelStorageService = module.default || module.NovelStorageService;
      console.log('Storage service class loaded:', !!NovelStorageService);
      console.log('Available exports:', Object.keys(module));
      storageServiceInitialized = true;
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow external API calls for LLM services
    }
  });

  // In development, load from Vite dev server, in production load from dist folder
  if (process.env.NODE_ENV === 'development') {
    // Wait for Vite dev server to be ready
    mainWindow.loadURL('http://127.0.0.1:5173').catch(err => {
      console.log('Failed to load URL, retrying in 1 second...');
      setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:5173').catch(err => {
          console.error('Failed to load URL after retry:', err);
        });
      }, 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(async () => {
  // 初始化存储服务
  await initializeStorageService();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Storage configuration
let userDataPath = app.getPath('userData');
let customStoragePath = null;
let storageService = null;

// Ensure storage directory exists
async function ensureStorageDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Get current storage path
function getStoragePath() {
  return customStoragePath || userDataPath;
}

// Initialize storage service
async function initStorageService() {
  await initializeStorageService();
  if (!storageService && NovelStorageService) {
    console.log('Creating new storage service instance...');
    storageService = new NovelStorageService(getStoragePath());
    console.log('Storage service created:', !!storageService);
  }
  if (!storageService) {
    console.error('Storage service is null after initialization');
    throw new Error('Failed to initialize storage service');
  }
  return storageService;
}

// Get novels file path
function getNovelsFilePath() {
  return path.join(getStoragePath(), 'novels.json');
}

// IPC handlers for file operations
ipcMain.handle('storage:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择小说存储目录'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    customStoragePath = result.filePaths[0];
    await ensureStorageDir(customStoragePath);
    return customStoragePath;
  }
  return null;
});

ipcMain.handle('storage:getCurrentPath', () => {
  return getStoragePath();
});

ipcMain.handle('storage:resetToDefault', () => {
  customStoragePath = null;
  return userDataPath;
});

ipcMain.handle('storage:saveNovels', async (event, novelsData) => {
  try {
    const storageDir = getStoragePath();
    await ensureStorageDir(storageDir);
    
    const filePath = getNovelsFilePath();
    await fs.writeFile(filePath, JSON.stringify(novelsData, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('保存小说数据失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:loadNovels', async () => {
  try {
    const filePath = getNovelsFilePath();
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: [] };
    }
    console.error('加载小说数据失败:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 新存储API ====================

// 小说元数据管理
ipcMain.handle('storage:loadNovelMetadata', async (event, novelId) => {
  try {
    const service = await initStorageService();
    return await service.loadNovelMetadata(novelId);
  } catch (error) {
    console.error('Error in loadNovelMetadata:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:saveNovelMetadata', async (event, novelId, metadata) => {
  try {
    const service = await initStorageService();
    return await service.saveNovelMetadata(novelId, metadata);
  } catch (error) {
    console.error('Error in saveNovelMetadata:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:deleteNovel', async (event, novelId) => {
  try {
    const service = await initStorageService();
    return await service.deleteNovel(novelId);
  } catch (error) {
    console.error('Error in deleteNovel:', error);
    return { success: false, error: error.message };
  }
});

// 章节索引管理
ipcMain.handle('storage:loadChapterIndex', async (event, novelId) => {
  const service = await initStorageService();
  return await service.loadChapterIndex(novelId);
});

ipcMain.handle('storage:saveChapterIndex', async (event, novelId, index) => {
  const service = await initStorageService();
  return await service.saveChapterIndex(novelId, index);
});

// 章节数据管理
ipcMain.handle('storage:loadChapter', async (event, novelId, chapterId) => {
  const service = await initStorageService();
  return await service.loadChapter(novelId, chapterId);
});

ipcMain.handle('storage:saveChapter', async (event, novelId, chapter) => {
  const service = await initStorageService();
  return await service.saveChapter(novelId, chapter);
});

ipcMain.handle('storage:deleteChapter', async (event, novelId, chapterId) => {
  const service = await initStorageService();
  return await service.deleteChapter(novelId, chapterId);
});

ipcMain.handle('storage:createChapter', async (event, novelId, chapterData) => {
  const service = await initStorageService();
  return await service.createChapter(novelId, chapterData);
});

// AI上下文管理
ipcMain.handle('storage:loadAIContext', async (event, novelId, chapterId) => {
  const service = await initStorageService();
  return await service.loadAIContext(novelId, chapterId);
});

ipcMain.handle('storage:saveAIContext', async (event, novelId, chapterId, context) => {
  const service = await initStorageService();
  return await service.saveAIContext(novelId, chapterId, context);
});

ipcMain.handle('storage:needsNewSummary', async (event, novelId, chapterId, content) => {
  const service = await initStorageService();
  return await service.needsNewSummary(novelId, chapterId, content);
});

ipcMain.handle('storage:generateChapterSummary', async (event, novelId, chapterId, content) => {
  const service = await initStorageService();
  return await service.generateChapterSummary(novelId, chapterId, content);
});

ipcMain.handle('storage:generateFullBookSummary', async (event, novelId) => {
  const service = await initStorageService();
  return await service.generateFullBookSummary(novelId);
});

// 世界书管理
ipcMain.handle('storage:loadWorldBook', async (event, novelId) => {
  const service = await initStorageService();
  return await service.loadWorldBook(novelId);
});

ipcMain.handle('storage:saveWorldBook', async (event, novelId, worldBook) => {
  const service = await initStorageService();
  return await service.saveWorldBook(novelId, worldBook);
});

// AI配置管理
ipcMain.handle('storage:loadAIConfig', async (event, novelId) => {
  const service = await initStorageService();
  return await service.loadAIConfig(novelId);
});

ipcMain.handle('storage:saveAIConfig', async (event, novelId, config) => {
  const service = await initStorageService();
  return await service.saveAIConfig(novelId, config);
});