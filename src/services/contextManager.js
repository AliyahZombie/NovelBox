/**
 * 上下文管理器服务
 * 处理章节AI概况功能，包括哈希检测、自动触发和手动总结
 */

import { ElectronStorageService } from './electron.js'
import { llmService } from './llm.js'

// 在浏览器环境中使用Web Crypto API
function calculateContentHash(content) {
  // 简单的哈希函数，用于浏览器环境
  let hash = 0;
  if (!content || content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16);
}

class ContextManagerService {
  constructor() {
    this.processingQueue = new Map() // 正在处理的章节队列
    this.autoSummaryEnabled = true
  }

  /**
   * 计算内容哈希值
   */
  calculateContentHash(content) {
    return calculateContentHash(content || '')
  }

  /**
   * 检查章节是否需要重新生成摘要
   */
  async needsNewSummary(novelId, chapterId, content) {
    try {
      const result = await ElectronStorageService.needsNewSummary(novelId, chapterId, content)
      return result.success ? result.data : true
    } catch (error) {
      console.error('检查摘要状态失败:', error)
      return true
    }
  }

  /**
   * 获取章节AI上下文
   */
  async getChapterContext(novelId, chapterId) {
    try {
      const result = await ElectronStorageService.loadAIContext(novelId, chapterId)
      return result.success ? result.data : null
    } catch (error) {
      console.error('加载章节上下文失败:', error)
      return null
    }
  }

  /**
   * 保存章节AI上下文
   */
  async saveChapterContext(novelId, chapterId, context) {
    try {
      const result = await ElectronStorageService.saveAIContext(novelId, chapterId, context)
      return result.success
    } catch (error) {
      console.error('保存章节上下文失败:', error)
      return false
    }
  }

  /**
   * 生成章节摘要
   */
  async generateChapterSummary(novelId, chapterId, content, options = {}) {
    const queueKey = `${novelId}:${chapterId}`
    
    // 检查是否已在处理队列中
    if (this.processingQueue.has(queueKey)) {
      return this.processingQueue.get(queueKey)
    }

    // 创建处理Promise
    const processingPromise = this._doGenerateChapterSummary(novelId, chapterId, content, options)
    this.processingQueue.set(queueKey, processingPromise)

    try {
      const result = await processingPromise
      return result
    } finally {
      this.processingQueue.delete(queueKey)
    }
  }

  /**
   * 实际执行章节摘要生成
   */
  async _doGenerateChapterSummary(novelId, chapterId, content, options = {}) {
    try {
      const contentHash = this.calculateContentHash(content)
      
      // 检查是否需要重新生成
      if (!options.force) {
        const needsNew = await this.needsNewSummary(novelId, chapterId, content)
        if (!needsNew) {
          const existingContext = await this.getChapterContext(novelId, chapterId)
          return { 
            success: true, 
            data: existingContext, 
            fromCache: true,
            message: '内容无更改，使用缓存摘要'
          }
        }
      }

      // 更新处理状态
      await this.saveChapterContext(novelId, chapterId, {
        contentHash,
        aiProcessingStatus: 'processing',
        summary: '',
        summaryUpdatedAt: null
      })

      // 获取世界书信息
      const worldBookInfo = await this._getWorldBookInfo(novelId)

      // 生成摘要提示词
      const prompt = this._generateSummaryPrompt(content, options, worldBookInfo)
      
      // 获取AI配置
      const aiConfig = await this._getAIConfig(novelId)
      const config = aiConfig.summaryConfig || aiConfig.rewriteConfig

      // 调用AI生成摘要 - 使用与AIPanel相同的调用方式
      const { LLMRequest } = await import('@/services')

      const llmRequest = new LLMRequest({
        prompt,
        maxTokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.3,
        stream: false
      })

      const response = await llmService.generateContent(
        config.provider || 'openai',
        config.model || 'gpt-3.5-turbo',
        llmRequest
      )

      if (!response.success) {
        // 提供更详细的错误信息
        let errorMessage = response.error || '生成摘要失败'

        // 处理常见的API错误
        if (errorMessage.includes('500') && errorMessage.includes('no candidates returned')) {
          errorMessage = 'AI服务暂时不可用，请稍后重试或检查网络连接'
        } else if (errorMessage.includes('401')) {
          errorMessage = 'API密钥无效，请检查设置中的API配置'
        } else if (errorMessage.includes('429')) {
          errorMessage = 'API调用频率过高，请稍后重试'
        } else if (errorMessage.includes('timeout')) {
          errorMessage = '请求超时，请检查网络连接'
        }

        throw new Error(errorMessage)
      }

      const summary = (response.content || response.data || '').trim()
      
      // 保存摘要结果
      const contextData = {
        contentHash,
        summary,
        summaryUpdatedAt: new Date().toISOString(),
        aiProcessingStatus: 'completed'
      }
      
      await this.saveChapterContext(novelId, chapterId, contextData)
      
      return { 
        success: true, 
        data: contextData, 
        fromCache: false,
        message: '摘要生成完成'
      }
    } catch (error) {
      console.error('生成章节摘要失败:', error)

      // 更新失败状态，包含更多错误信息
      await this.saveChapterContext(novelId, chapterId, {
        aiProcessingStatus: 'failed',
        lastError: error.message,
        lastErrorTime: new Date().toISOString(),
        errorDetails: {
          stack: error.stack,
          name: error.name,
          message: error.message
        }
      })

      return {
        success: false,
        error: error.message,
        message: '摘要生成失败',
        details: {
          novelId,
          chapterId,
          contentLength: content ? content.length : 0,
          error: error.stack || error.message
        }
      }
    }
  }

  /**
   * 生成摘要提示词
   */
  _generateSummaryPrompt(content, options = {}, worldBookInfo = '') {
    let basePrompt = `请为以下章节内容生成一个简洁的摘要，重点突出：
1. 主要情节发展
2. 人物动态和关系变化
3. 关键事件和转折点
4. 重要的世界观设定

要求：
- 摘要长度控制在200字以内
- 突出重点，避免细节描述
- 保持客观中性的语调
- 如果内容较短，可以适当简化`

    // 添加世界书信息
    if (worldBookInfo) {
      basePrompt += `\n\n【世界观设定参考】：\n${worldBookInfo}`
    }

    basePrompt += `\n\n【章节内容】：\n${content}`

    if (options.customPrompt) {
      return `${basePrompt}\n\n额外要求：${options.customPrompt}`
    }

    return basePrompt
  }

  /**
   * 获取AI配置 - 学习AIPanel的配置读取逻辑
   */
  async _getAIConfig(novelId) {
    try {
      // 尝试从localStorage读取概括配置
      const savedSummaryConfig = localStorage.getItem('novelbox-summary-config')
      if (savedSummaryConfig) {
        const config = JSON.parse(savedSummaryConfig)
        if (config.provider && config.model) {
          return {
            summaryConfig: {
              provider: config.provider,
              model: config.model,
              temperature: 0.3,
              maxTokens: 1000
            }
          }
        }
      }
      
      // 尝试从localStorage读取重写配置作为后备
      const savedRewriteConfig = localStorage.getItem('novelbox-rewrite-config')
      if (savedRewriteConfig) {
        const config = JSON.parse(savedRewriteConfig)
        if (config.provider && config.model) {
          return {
            summaryConfig: {
              provider: config.provider,
              model: config.model,
              temperature: 0.3,
              maxTokens: 1000
            },
            rewriteConfig: {
              provider: config.provider,
              model: config.model,
              temperature: 0.7,
              maxTokens: 2000
            }
          }
        }
      }

      // 如果localStorage没有配置，尝试从小说配置文件读取
      const result = await ElectronStorageService.loadAIConfig(novelId)
      return result.success ? result.data : this._getDefaultAIConfig()
    } catch (error) {
      console.error('加载AI配置失败:', error)
      return this._getDefaultAIConfig()
    }
  }

  /**
   * 获取默认AI配置
   */
  _getDefaultAIConfig() {
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
      }
    }
  }

  /**
   * 获取世界书信息
   */
  async _getWorldBookInfo(novelId) {
    try {
      const result = await ElectronStorageService.loadWorldBook(novelId)
      if (!result.success || !result.data || !result.data.settings) {
        return ''
      }

      const settings = result.data.settings
      const parts = []

      // 世界设定
      if (settings.world && settings.world.name) {
        parts.push(`世界名称：${settings.world.name}`)
        if (settings.world.description) {
          parts.push(`世界描述：${settings.world.description}`)
        }
        if (settings.world.rules && settings.world.rules.length > 0) {
          parts.push(`世界规则：${settings.world.rules.join('；')}`)
        }
      }

      // 主要人物
      if (settings.characters && settings.characters.length > 0) {
        const characterInfo = settings.characters
          .filter(c => c.name)
          .map(c => {
            let info = `${c.name}：${c.description || ''}`
            if (c.example) {
              info += `\n描写示例：${c.example}`
            }
            if (c.traits && c.traits.length > 0) {
              info += `\n特征：${c.traits.join('、')}`
            }
            return info
          })
          .join('\n\n')
        if (characterInfo) {
          parts.push(`主要人物：\n${characterInfo}`)
        }
      }

      return parts.join('\n\n')
    } catch (error) {
      console.error('获取世界书信息失败:', error)
      return ''
    }
  }

  /**
   * 生成全书摘要
   */
  async generateFullBookSummary(novelId, options = {}) {
    try {
      // 获取章节索引
      const indexResult = await ElectronStorageService.loadChapterIndex(novelId)
      if (!indexResult.success) {
        throw new Error('无法加载章节索引')
      }

      const chapters = indexResult.data.chapters
      const summaries = []

      // 收集所有章节摘要
      for (const chapterInfo of chapters) {
        const context = await this.getChapterContext(novelId, chapterInfo.id)
        if (context && context.summary && context.aiProcessingStatus === 'completed') {
          summaries.push({
            title: chapterInfo.title,
            summary: context.summary
          })
        }
      }

      if (summaries.length === 0) {
        throw new Error('没有可用的章节摘要')
      }

      // 直接拼接章节概括，不再使用AI重新概括
      const fullBookSummary = summaries
        .map((s, index) => `第${index + 1}章 ${s.title}:\n${s.summary}`)
        .join('\n\n')

      return {
        success: true,
        data: fullBookSummary,
        chapterCount: summaries.length,
        message: '全书摘要生成完成'
      }
    } catch (error) {
      console.error('生成全书摘要失败:', error)
      return {
        success: false,
        error: error.message,
        message: '全书摘要生成失败'
      }
    }
  }

  /**
   * 自动触发章节摘要生成
   */
  async autoGenerateSummary(novelId, chapterId, content) {
    if (!this.autoSummaryEnabled) {
      return { success: false, message: '自动摘要已禁用' }
    }

    // 检查内容长度，太短的内容不生成摘要
    if (!content || content.trim().length < 100) {
      return { success: false, message: '内容太短，跳过摘要生成' }
    }

    return await this.generateChapterSummary(novelId, chapterId, content, { auto: true })
  }

  /**
   * 获取摘要生成进度
   */
  async getSummaryProgress(novelId) {
    try {
      const indexResult = await ElectronStorageService.loadChapterIndex(novelId)
      if (!indexResult.success) {
        return { success: false, error: '无法加载章节索引' }
      }

      const chapters = indexResult.data.chapters
      const progress = {
        total: chapters.length,
        completed: 0,
        processing: 0,
        failed: 0,
        pending: 0
      }

      for (const chapterInfo of chapters) {
        const context = await this.getChapterContext(novelId, chapterInfo.id)
        if (!context) {
          progress.pending++
        } else {
          switch (context.aiProcessingStatus) {
            case 'completed':
              progress.completed++
              break
            case 'processing':
              progress.processing++
              break
            case 'failed':
              progress.failed++
              break
            default:
              progress.pending++
          }
        }
      }

      return { success: true, data: progress }
    } catch (error) {
      console.error('获取摘要进度失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 设置自动摘要开关
   */
  setAutoSummaryEnabled(enabled) {
    this.autoSummaryEnabled = enabled
  }

  /**
   * 获取自动摘要状态
   */
  isAutoSummaryEnabled() {
    return this.autoSummaryEnabled
  }
}

// 创建单例实例
const contextManager = new ContextManagerService()

export { ContextManagerService, contextManager }
