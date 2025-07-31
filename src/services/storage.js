/**
 * NovelBox 新存储服务层
 * 实现分层存储结构，支持大型小说的高效存储和访问
 */

// 注意：这个文件只在Node.js环境中运行（主进程）
const { promises: fs } = require('fs')
const path = require('path')
const crypto = require('crypto')

class NovelStorageService {
  constructor(basePath) {
    this.basePath = basePath
    this.cache = new Map() // LRU缓存
    this.maxCacheSize = 50 // 最大缓存章节数
  }

  /**
   * 确保目录存在
   */
  async ensureDir(dirPath) {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  /**
   * 获取小说存储路径
   */
  getNovelPath(novelId) {
    return path.join(this.basePath, 'novels', novelId)
  }

  /**
   * 获取章节存储路径
   */
  getChaptersPath(novelId) {
    return path.join(this.getNovelPath(novelId), 'chapters')
  }

  /**
   * 获取AI上下文存储路径
   */
  getContextsPath(novelId) {
    return path.join(this.getNovelPath(novelId), 'contexts')
  }

  /**
   * 计算内容哈希值
   */
  calculateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * LRU缓存管理
   */
  getCacheKey(novelId, chapterId) {
    return `${novelId}:${chapterId}`
  }

  setCache(novelId, chapterId, data) {
    const key = this.getCacheKey(novelId, chapterId)
    
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  getCache(novelId, chapterId) {
    const key = this.getCacheKey(novelId, chapterId)
    const cached = this.cache.get(key)
    
    if (cached) {
      // 重新设置以更新LRU顺序
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached.data
    }
    
    return null
  }

  clearCache(novelId, chapterId = null) {
    if (chapterId) {
      const key = this.getCacheKey(novelId, chapterId)
      this.cache.delete(key)
    } else {
      // 清除该小说的所有缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${novelId}:`)) {
          this.cache.delete(key)
        }
      }
    }
  }

  // ==================== 小说元数据管理 ====================

  /**
   * 加载小说元数据
   */
  async loadNovelMetadata(novelId) {
    try {
      const filePath = path.join(this.getNovelPath(novelId), 'novel.json')
      const data = await fs.readFile(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Novel not found' }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存小说元数据
   */
  async saveNovelMetadata(novelId, metadata) {
    try {
      const novelPath = this.getNovelPath(novelId)
      await this.ensureDir(novelPath)
      
      const filePath = path.join(novelPath, 'novel.json')
      const dataToSave = {
        ...metadata,
        id: novelId,
        updatedAt: new Date().toISOString(),
        version: '1.0'
      }
      
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除小说
   */
  async deleteNovel(novelId) {
    try {
      const novelPath = this.getNovelPath(novelId)
      await fs.rmdir(novelPath, { recursive: true })
      this.clearCache(novelId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ==================== 章节索引管理 ====================

  /**
   * 加载章节索引
   */
  async loadChapterIndex(novelId) {
    try {
      const filePath = path.join(this.getChaptersPath(novelId), 'index.json')
      const data = await fs.readFile(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, data: { chapters: [] } }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存章节索引
   */
  async saveChapterIndex(novelId, index) {
    try {
      const chaptersPath = this.getChaptersPath(novelId)
      await this.ensureDir(chaptersPath)
      
      const filePath = path.join(chaptersPath, 'index.json')
      await fs.writeFile(filePath, JSON.stringify(index, null, 2), 'utf8')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ==================== 章节数据管理 ====================

  /**
   * 加载章节
   */
  async loadChapter(novelId, chapterId) {
    // 先检查缓存
    const cached = this.getCache(novelId, chapterId)
    if (cached) {
      return { success: true, data: cached }
    }

    try {
      const filePath = path.join(this.getChaptersPath(novelId), `${chapterId}.json`)
      const data = await fs.readFile(filePath, 'utf8')
      const chapter = JSON.parse(data)
      
      // 添加到缓存
      this.setCache(novelId, chapterId, chapter)
      
      return { success: true, data: chapter }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Chapter not found' }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存章节
   */
  async saveChapter(novelId, chapter) {
    try {
      const chaptersPath = this.getChaptersPath(novelId)
      await this.ensureDir(chaptersPath)
      
      const chapterData = {
        ...chapter,
        updatedAt: new Date().toISOString(),
        wordCount: this.calculateWordCount(chapter.content)
      }
      
      const filePath = path.join(chaptersPath, `${chapter.id}.json`)
      await fs.writeFile(filePath, JSON.stringify(chapterData, null, 2), 'utf8')
      
      // 更新缓存
      this.setCache(novelId, chapter.id, chapterData)
      
      // 更新章节索引
      await this.updateChapterInIndex(novelId, chapterData)
      
      return { success: true, data: chapterData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除章节
   */
  async deleteChapter(novelId, chapterId) {
    try {
      const filePath = path.join(this.getChaptersPath(novelId), `${chapterId}.json`)
      await fs.unlink(filePath)
      
      // 清除缓存
      this.clearCache(novelId, chapterId)
      
      // 从索引中移除
      await this.removeChapterFromIndex(novelId, chapterId)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 创建新章节
   */
  async createChapter(novelId, chapterData) {
    const chapterId = Date.now().toString()
    const chapter = {
      id: chapterId,
      title: chapterData.title || '新章节',
      content: chapterData.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: chapterData.tags || [],
      references: chapterData.references || []
    }
    
    return await this.saveChapter(novelId, chapter)
  }

  /**
   * 计算字数
   */
  calculateWordCount(content) {
    if (!content) return 0
    // 简单的中文字数统计
    return content.replace(/\s/g, '').length
  }

  /**
   * 更新章节索引中的章节信息
   */
  async updateChapterInIndex(novelId, chapter) {
    const indexResult = await this.loadChapterIndex(novelId)
    if (!indexResult.success) return

    const index = indexResult.data
    const existingIndex = index.chapters.findIndex(c => c.id === chapter.id)
    
    const chapterIndexData = {
      id: chapter.id,
      title: chapter.title,
      wordCount: chapter.wordCount,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      position: existingIndex >= 0 ? index.chapters[existingIndex].position : index.chapters.length
    }
    
    if (existingIndex >= 0) {
      index.chapters[existingIndex] = chapterIndexData
    } else {
      index.chapters.push(chapterIndexData)
    }
    
    await this.saveChapterIndex(novelId, index)
  }

  /**
   * 从索引中移除章节
   */
  async removeChapterFromIndex(novelId, chapterId) {
    const indexResult = await this.loadChapterIndex(novelId)
    if (!indexResult.success) return

    const index = indexResult.data
    index.chapters = index.chapters.filter(c => c.id !== chapterId)
    
    await this.saveChapterIndex(novelId, index)
  }

  // ==================== AI上下文管理 ====================

  /**
   * 加载AI上下文
   */
  async loadAIContext(novelId, chapterId) {
    try {
      const filePath = path.join(this.getContextsPath(novelId), `${chapterId}.json`)
      const data = await fs.readFile(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, data: null }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存AI上下文
   */
  async saveAIContext(novelId, chapterId, context) {
    try {
      const contextsPath = this.getContextsPath(novelId)
      await this.ensureDir(contextsPath)

      const contextData = {
        chapterId,
        ...context,
        lastProcessedAt: new Date().toISOString()
      }

      const filePath = path.join(contextsPath, `${chapterId}.json`)
      await fs.writeFile(filePath, JSON.stringify(contextData, null, 2), 'utf8')

      return { success: true, data: contextData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 检查章节内容是否需要重新生成摘要
   */
  async needsNewSummary(novelId, chapterId, currentContent) {
    const contextResult = await this.loadAIContext(novelId, chapterId)
    if (!contextResult.success || !contextResult.data) {
      return true // 没有上下文数据，需要生成
    }

    const context = contextResult.data
    const currentHash = this.calculateContentHash(currentContent)

    return context.contentHash !== currentHash
  }

  /**
   * 生成章节摘要
   */
  async generateChapterSummary(novelId, chapterId, content, llmService) {
    try {
      const contentHash = this.calculateContentHash(content)

      // 检查是否需要重新生成
      const needsNew = await this.needsNewSummary(novelId, chapterId, content)
      if (!needsNew) {
        const existingContext = await this.loadAIContext(novelId, chapterId)
        return { success: true, data: existingContext.data, fromCache: true }
      }

      // 更新处理状态
      await this.saveAIContext(novelId, chapterId, {
        contentHash,
        aiProcessingStatus: 'processing',
        summary: '',
        summaryUpdatedAt: null
      })

      // 调用AI生成摘要
      const prompt = `请为以下章节内容生成一个简洁的摘要，重点突出情节发展、人物动态和关键事件：\n\n${content}`

      // 这里需要调用LLM服务
      // const response = await llmService.generateContent(prompt)

      // 暂时使用模拟数据
      const summary = `章节摘要：${content.substring(0, 100)}...`

      const contextData = {
        contentHash,
        summary,
        summaryUpdatedAt: new Date().toISOString(),
        aiProcessingStatus: 'completed'
      }

      await this.saveAIContext(novelId, chapterId, contextData)

      return { success: true, data: contextData, fromCache: false }
    } catch (error) {
      // 更新失败状态
      await this.saveAIContext(novelId, chapterId, {
        aiProcessingStatus: 'failed'
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * 生成全书摘要
   */
  async generateFullBookSummary(novelId, llmService) {
    try {
      const indexResult = await this.loadChapterIndex(novelId)
      if (!indexResult.success) {
        return { success: false, error: 'Failed to load chapter index' }
      }

      const chapters = indexResult.data.chapters
      const summaries = []

      // 收集所有章节摘要
      for (const chapterInfo of chapters) {
        const contextResult = await this.loadAIContext(novelId, chapterInfo.id)
        if (contextResult.success && contextResult.data && contextResult.data.summary) {
          summaries.push({
            title: chapterInfo.title,
            summary: contextResult.data.summary
          })
        }
      }

      if (summaries.length === 0) {
        return { success: false, error: 'No chapter summaries available' }
      }

      // 生成全书摘要
      const combinedSummaries = summaries.map(s => `${s.title}: ${s.summary}`).join('\n\n')
      const prompt = `基于以下各章节摘要，生成一个完整的小说概括：\n\n${combinedSummaries}`

      // 这里需要调用LLM服务
      // const response = await llmService.generateContent(prompt)

      // 暂时使用模拟数据
      const fullBookSummary = `全书概括：基于${summaries.length}个章节的内容...`

      return { success: true, data: fullBookSummary }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ==================== 世界书管理 ====================

  /**
   * 加载世界书
   */
  async loadWorldBook(novelId) {
    try {
      const filePath = path.join(this.getNovelPath(novelId), 'worldbook.json')
      const data = await fs.readFile(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, data: this.getDefaultWorldBook() }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存世界书
   */
  async saveWorldBook(novelId, worldBook) {
    try {
      const novelPath = this.getNovelPath(novelId)
      await this.ensureDir(novelPath)

      const worldBookData = {
        ...worldBook,
        updatedAt: new Date().toISOString()
      }

      const filePath = path.join(novelPath, 'worldbook.json')
      await fs.writeFile(filePath, JSON.stringify(worldBookData, null, 2), 'utf8')

      return { success: true, data: worldBookData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取默认世界书结构
   */
  getDefaultWorldBook() {
    return {
      settings: {
        world: {
          name: '',
          description: '',
          rules: []
        },
        characters: [],
        locations: [],
        items: [],
        timeline: []
      },
      updatedAt: new Date().toISOString()
    }
  }

  // ==================== AI配置管理 ====================

  /**
   * 加载AI配置
   */
  async loadAIConfig(novelId) {
    try {
      const filePath = path.join(this.getNovelPath(novelId), 'ai_config.json')
      const data = await fs.readFile(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, data: this.getDefaultAIConfig() }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * 保存AI配置
   */
  async saveAIConfig(novelId, config) {
    try {
      const novelPath = this.getNovelPath(novelId)
      await this.ensureDir(novelPath)

      const configData = {
        ...config,
        updatedAt: new Date().toISOString()
      }

      const filePath = path.join(novelPath, 'ai_config.json')
      await fs.writeFile(filePath, JSON.stringify(configData, null, 2), 'utf8')

      return { success: true, data: configData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取默认AI配置
   */
  getDefaultAIConfig() {
    return {
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      rewriteConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
      },
      summaryConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 1000
      },
      updatedAt: new Date().toISOString()
    }
  }
}

module.exports = NovelStorageService
module.exports.NovelStorageService = NovelStorageService
module.exports.default = NovelStorageService
