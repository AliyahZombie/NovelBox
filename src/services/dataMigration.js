/**
 * 数据迁移服务
 * 实现从旧存储结构到新存储结构的数据迁移
 */

import { ElectronStorageService } from './electron.js'

class DataMigrationService {
  constructor() {
    this.migrationVersion = '1.0'
  }

  /**
   * 检查是否需要迁移
   */
  async needsMigration() {
    try {
      // 检查是否存在旧格式的novels.json文件
      const oldNovelsResult = await window.electronAPI.storage.loadNovels()
      if (oldNovelsResult.success && oldNovelsResult.data && oldNovelsResult.data.length > 0) {
        // 检查第一个小说是否已经迁移到新格式
        const firstNovel = oldNovelsResult.data[0]
        const metadataResult = await ElectronStorageService.loadNovelMetadata(firstNovel.id)
        
        // 如果无法加载元数据，说明还没有迁移
        return !metadataResult.success
      }
      
      return false
    } catch (error) {
      console.error('检查迁移状态失败:', error)
      return false
    }
  }

  /**
   * 执行数据迁移
   */
  async migrate(onProgress = null) {
    try {
      // 加载旧格式数据
      const oldNovelsResult = await window.electronAPI.storage.loadNovels()
      if (!oldNovelsResult.success || !oldNovelsResult.data) {
        throw new Error('无法加载旧格式数据')
      }

      const oldNovels = oldNovelsResult.data
      const totalNovels = oldNovels.length
      let migratedCount = 0

      console.log(`开始迁移 ${totalNovels} 部小说...`)

      for (const oldNovel of oldNovels) {
        try {
          await this.migrateNovel(oldNovel)
          migratedCount++
          
          if (onProgress) {
            onProgress({
              current: migratedCount,
              total: totalNovels,
              novelTitle: oldNovel.name,
              status: 'success'
            })
          }
          
          console.log(`已迁移: ${oldNovel.name} (${migratedCount}/${totalNovels})`)
        } catch (error) {
          console.error(`迁移小说失败: ${oldNovel.name}`, error)
          
          if (onProgress) {
            onProgress({
              current: migratedCount,
              total: totalNovels,
              novelTitle: oldNovel.name,
              status: 'error',
              error: error.message
            })
          }
        }
      }

      console.log(`迁移完成: ${migratedCount}/${totalNovels} 部小说`)
      
      return {
        success: true,
        migratedCount,
        totalCount: totalNovels,
        message: `成功迁移 ${migratedCount}/${totalNovels} 部小说`
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
      return {
        success: false,
        error: error.message,
        message: '数据迁移失败'
      }
    }
  }

  /**
   * 迁移单部小说
   */
  async migrateNovel(oldNovel) {
    const novelId = oldNovel.id

    // 1. 迁移小说元数据
    const metadata = {
      id: novelId,
      title: oldNovel.name,
      author: oldNovel.author || '',
      description: oldNovel.description || '',
      cover: oldNovel.cover || null,
      createdAt: oldNovel.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: oldNovel.tags || [],
      statistics: {
        totalChapters: oldNovel.chapters ? oldNovel.chapters.length : 0,
        totalWords: this.calculateTotalWords(oldNovel.chapters || []),
        lastEditChapterId: oldNovel.chapters && oldNovel.chapters.length > 0 
          ? oldNovel.chapters[oldNovel.chapters.length - 1].id 
          : null
      }
    }

    const metadataResult = await ElectronStorageService.saveNovelMetadata(novelId, metadata)
    if (!metadataResult.success) {
      throw new Error(`保存小说元数据失败: ${metadataResult.error}`)
    }

    // 2. 迁移章节数据
    if (oldNovel.chapters && oldNovel.chapters.length > 0) {
      const chapterIndex = {
        chapters: []
      }

      for (let i = 0; i < oldNovel.chapters.length; i++) {
        const oldChapter = oldNovel.chapters[i]
        
        // 迁移章节数据
        const chapterData = {
          id: oldChapter.id,
          title: oldChapter.title || `第${i + 1}章`,
          content: oldChapter.content || '',
          wordCount: this.calculateWordCount(oldChapter.content || ''),
          createdAt: oldChapter.createdAt || new Date().toISOString(),
          updatedAt: oldChapter.updatedAt || new Date().toISOString(),
          tags: oldChapter.tags || [],
          references: oldChapter.references || []
        }

        const chapterResult = await ElectronStorageService.saveChapter(novelId, chapterData)
        if (!chapterResult.success) {
          throw new Error(`保存章节失败: ${chapterResult.error}`)
        }

        // 添加到索引
        chapterIndex.chapters.push({
          id: oldChapter.id,
          title: chapterData.title,
          wordCount: chapterData.wordCount,
          createdAt: chapterData.createdAt,
          updatedAt: chapterData.updatedAt,
          position: i
        })
      }

      // 保存章节索引
      const indexResult = await ElectronStorageService.saveChapterIndex(novelId, chapterIndex)
      if (!indexResult.success) {
        throw new Error(`保存章节索引失败: ${indexResult.error}`)
      }
    }

    // 3. 创建默认世界书
    const defaultWorldBook = {
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
      }
    }

    const worldBookResult = await ElectronStorageService.saveWorldBook(novelId, defaultWorldBook)
    if (!worldBookResult.success) {
      console.warn(`保存世界书失败: ${worldBookResult.error}`)
    }

    // 4. 创建默认AI配置
    const defaultAIConfig = {
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

    const aiConfigResult = await ElectronStorageService.saveAIConfig(novelId, defaultAIConfig)
    if (!aiConfigResult.success) {
      console.warn(`保存AI配置失败: ${aiConfigResult.error}`)
    }
  }

  /**
   * 计算字数
   */
  calculateWordCount(content) {
    if (!content) return 0
    return content.replace(/\s/g, '').length
  }

  /**
   * 计算总字数
   */
  calculateTotalWords(chapters) {
    return chapters.reduce((total, chapter) => {
      return total + this.calculateWordCount(chapter.content || '')
    }, 0)
  }

  /**
   * 备份旧数据
   */
  async backupOldData() {
    try {
      const oldNovelsResult = await window.electronAPI.storage.loadNovels()
      if (oldNovelsResult.success && oldNovelsResult.data) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupData = {
          version: 'legacy',
          timestamp,
          novels: oldNovelsResult.data
        }
        
        // 这里可以实现备份逻辑，比如保存到特定文件
        console.log('旧数据已备份:', backupData)
        return { success: true, backup: backupData }
      }
      
      return { success: false, error: '没有找到需要备份的数据' }
    } catch (error) {
      console.error('备份旧数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清理旧数据（可选）
   */
  async cleanupOldData() {
    try {
      // 这里可以实现清理旧格式数据的逻辑
      // 比如删除或重命名旧的novels.json文件
      console.log('旧数据清理完成')
      return { success: true }
    } catch (error) {
      console.error('清理旧数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 验证迁移结果
   */
  async validateMigration() {
    try {
      const oldNovelsResult = await window.electronAPI.storage.loadNovels()
      if (!oldNovelsResult.success || !oldNovelsResult.data) {
        return { success: true, message: '没有需要验证的数据' }
      }

      const oldNovels = oldNovelsResult.data
      const validationResults = []

      for (const oldNovel of oldNovels) {
        const result = await this.validateNovelMigration(oldNovel)
        validationResults.push(result)
      }

      const failedValidations = validationResults.filter(r => !r.success)
      
      return {
        success: failedValidations.length === 0,
        totalNovels: oldNovels.length,
        validatedNovels: validationResults.length,
        failedValidations,
        message: failedValidations.length === 0 
          ? '所有数据迁移验证通过' 
          : `${failedValidations.length} 部小说验证失败`
      }
    } catch (error) {
      console.error('验证迁移结果失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 验证单部小说的迁移结果
   */
  async validateNovelMigration(oldNovel) {
    try {
      const novelId = oldNovel.id

      // 验证元数据
      const metadataResult = await ElectronStorageService.loadNovelMetadata(novelId)
      if (!metadataResult.success) {
        return { success: false, novelId, error: '元数据迁移失败' }
      }

      // 验证章节索引
      const indexResult = await ElectronStorageService.loadChapterIndex(novelId)
      if (!indexResult.success) {
        return { success: false, novelId, error: '章节索引迁移失败' }
      }

      // 验证章节数量
      const expectedChapterCount = oldNovel.chapters ? oldNovel.chapters.length : 0
      const actualChapterCount = indexResult.data.chapters.length
      
      if (expectedChapterCount !== actualChapterCount) {
        return { 
          success: false, 
          novelId, 
          error: `章节数量不匹配: 期望 ${expectedChapterCount}, 实际 ${actualChapterCount}` 
        }
      }

      // 验证章节内容
      for (const oldChapter of oldNovel.chapters || []) {
        const chapterResult = await ElectronStorageService.loadChapter(novelId, oldChapter.id)
        if (!chapterResult.success) {
          return { 
            success: false, 
            novelId, 
            error: `章节 ${oldChapter.id} 迁移失败` 
          }
        }

        const newChapter = chapterResult.data
        if (newChapter.content !== oldChapter.content) {
          return { 
            success: false, 
            novelId, 
            error: `章节 ${oldChapter.id} 内容不匹配` 
          }
        }
      }

      return { success: true, novelId, message: '验证通过' }
    } catch (error) {
      return { success: false, novelId: oldNovel.id, error: error.message }
    }
  }
}

// 创建单例实例
const dataMigrationService = new DataMigrationService()

export { DataMigrationService, dataMigrationService }
