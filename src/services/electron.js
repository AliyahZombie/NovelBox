/**
 * Electron API Service - handles communication with Electron main process
 */

export class ElectronStorageService {
  static async loadNovels() {
    try {
      return await window.electronAPI.storage.loadNovels()
    } catch (error) {
      console.error('Failed to load novels:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveNovels(novels) {
    try {
      return await window.electronAPI.storage.saveNovels(novels)
    } catch (error) {
      console.error('Failed to save novels:', error)
      return { success: false, error: error.message }
    }
  }

  static async getCurrentPath() {
    try {
      return await window.electronAPI.storage.getCurrentPath()
    } catch (error) {
      console.error('Failed to get current path:', error)
      throw error
    }
  }

  static async selectDirectory() {
    try {
      return await window.electronAPI.storage.selectDirectory()
    } catch (error) {
      console.error('Failed to select directory:', error)
      throw error
    }
  }

  static async resetToDefault() {
    try {
      return await window.electronAPI.storage.resetToDefault()
    } catch (error) {
      console.error('Failed to reset to default:', error)
      throw error
    }
  }

  // ==================== 新存储API ====================

  // 小说元数据管理
  static async loadNovelMetadata(novelId) {
    try {
      return await window.electronAPI.storage.loadNovelMetadata(novelId)
    } catch (error) {
      console.error('Failed to load novel metadata:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveNovelMetadata(novelId, metadata) {
    try {
      return await window.electronAPI.storage.saveNovelMetadata(novelId, metadata)
    } catch (error) {
      console.error('Failed to save novel metadata:', error)
      return { success: false, error: error.message }
    }
  }

  static async deleteNovel(novelId) {
    try {
      return await window.electronAPI.storage.deleteNovel(novelId)
    } catch (error) {
      console.error('Failed to delete novel:', error)
      return { success: false, error: error.message }
    }
  }

  // 章节索引管理
  static async loadChapterIndex(novelId) {
    try {
      return await window.electronAPI.storage.loadChapterIndex(novelId)
    } catch (error) {
      console.error('Failed to load chapter index:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveChapterIndex(novelId, index) {
    try {
      return await window.electronAPI.storage.saveChapterIndex(novelId, index)
    } catch (error) {
      console.error('Failed to save chapter index:', error)
      return { success: false, error: error.message }
    }
  }

  // 章节数据管理
  static async loadChapter(novelId, chapterId) {
    try {
      return await window.electronAPI.storage.loadChapter(novelId, chapterId)
    } catch (error) {
      console.error('Failed to load chapter:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveChapter(novelId, chapter) {
    try {
      return await window.electronAPI.storage.saveChapter(novelId, chapter)
    } catch (error) {
      console.error('Failed to save chapter:', error)
      return { success: false, error: error.message }
    }
  }

  static async deleteChapter(novelId, chapterId) {
    try {
      return await window.electronAPI.storage.deleteChapter(novelId, chapterId)
    } catch (error) {
      console.error('Failed to delete chapter:', error)
      return { success: false, error: error.message }
    }
  }

  static async createChapter(novelId, chapterData) {
    try {
      return await window.electronAPI.storage.createChapter(novelId, chapterData)
    } catch (error) {
      console.error('Failed to create chapter:', error)
      return { success: false, error: error.message }
    }
  }

  // AI上下文管理
  static async loadAIContext(novelId, chapterId) {
    try {
      return await window.electronAPI.storage.loadAIContext(novelId, chapterId)
    } catch (error) {
      console.error('Failed to load AI context:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveAIContext(novelId, chapterId, context) {
    try {
      return await window.electronAPI.storage.saveAIContext(novelId, chapterId, context)
    } catch (error) {
      console.error('Failed to save AI context:', error)
      return { success: false, error: error.message }
    }
  }

  static async needsNewSummary(novelId, chapterId, content) {
    try {
      return await window.electronAPI.storage.needsNewSummary(novelId, chapterId, content)
    } catch (error) {
      console.error('Failed to check summary status:', error)
      return { success: false, error: error.message }
    }
  }

  static async generateChapterSummary(novelId, chapterId, content) {
    try {
      return await window.electronAPI.storage.generateChapterSummary(novelId, chapterId, content)
    } catch (error) {
      console.error('Failed to generate chapter summary:', error)
      return { success: false, error: error.message }
    }
  }

  static async generateFullBookSummary(novelId) {
    try {
      return await window.electronAPI.storage.generateFullBookSummary(novelId)
    } catch (error) {
      console.error('Failed to generate full book summary:', error)
      return { success: false, error: error.message }
    }
  }

  // 世界书管理
  static async loadWorldBook(novelId) {
    try {
      return await window.electronAPI.storage.loadWorldBook(novelId)
    } catch (error) {
      console.error('Failed to load world book:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveWorldBook(novelId, worldBook) {
    try {
      return await window.electronAPI.storage.saveWorldBook(novelId, worldBook)
    } catch (error) {
      console.error('Failed to save world book:', error)
      return { success: false, error: error.message }
    }
  }

  // AI配置管理
  static async loadAIConfig(novelId) {
    try {
      return await window.electronAPI.storage.loadAIConfig(novelId)
    } catch (error) {
      console.error('Failed to load AI config:', error)
      return { success: false, error: error.message }
    }
  }

  static async saveAIConfig(novelId, config) {
    try {
      return await window.electronAPI.storage.saveAIConfig(novelId, config)
    } catch (error) {
      console.error('Failed to save AI config:', error)
      return { success: false, error: error.message }
    }
  }
}