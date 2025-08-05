import { defineStore } from 'pinia'
import { useNovelsStore } from './novels'
import { useUIStore } from './ui'
import i18n from '@/locales/i18n'
import { contextManager } from '@/services/contextManager'

const t = i18n.global.t
export const useChaptersStore = defineStore('chapters', {
  state: () => ({
    currentChapter: null,
    autoSaveTimer: null,
    draggedChapterId: null,
    autoSaveCallback: null
  }),

  getters: {
    chapters: () => {
      const novelsStore = useNovelsStore()
      return novelsStore.currentNovel?.chapters || []
    },
    
    currentChapterTitle: (state) => state.currentChapter?.title || '',
    currentChapterContent: (state) => state.currentChapter?.content || '',
    currentChapterWordCount: (state) => state.currentChapter?.wordCount || 0,
    
    hasChapters() {
      return this.chapters.length > 0
    }
  },

  actions: {

    async addAutoSaveCallback(callback) {
      this.autoSaveCallback = callback
    },


    async openChapter(chapterId) {
      const novelsStore = useNovelsStore()
      const uiStore = useUIStore()
      
      // Save current chapter before switching
      if (this.currentChapter) {
        await novelsStore.saveNovels()

        // 切换章节时检查是否需要自动摘要（只有内容有变动时才触发）
        if (contextManager.isAutoSummaryEnabled() && this.currentChapter.content && this.currentChapter.content.trim().length > 100) {
          try {
            // 检查是否需要重新生成摘要
            const needsNew = await contextManager.needsNewSummary(
              novelsStore.currentNovel.id,
              this.currentChapter.id,
              this.currentChapter.content
            )
            
            if (needsNew) {
              // 先更新UI状态为processing，让用户看到正在处理
              await contextManager.saveChapterContext(
                novelsStore.currentNovel.id,
                this.currentChapter.id,
                {
                  aiProcessingStatus: 'processing',
                  summary: '',
                  summaryUpdatedAt: null
                }
              )
              
              console.log(`开始为章节 "${this.currentChapter.title}" 生成摘要...`)
              
              // 后台异步生成摘要
              contextManager.autoGenerateSummary(
                novelsStore.currentNovel.id,
                this.currentChapter.id,
                this.currentChapter.content
              ).then(result => {
                if (result.success) {
                  console.log(`章节 "${this.currentChapter.title}" 自动生成摘要完成`)
                } else {
                  console.warn(`章节 "${this.currentChapter.title}" 摘要生成失败:`, result.error)
                }
              }).catch(error => {
                console.warn('自动摘要生成异常:', error)
              })
            }
          } catch (error) {
            console.warn('切换章节时自动摘要检查失败:', error)
          }
        }

        uiStore.showSaveMessage(t('editor.autoSaveIndicator'))
      }

      const chapter = this.chapters.find(c => c.id === chapterId)
      if (chapter) {
        this.currentChapter = chapter
        this.startAutoSave()
      }
    },

    async addNewChapter() {
      const novelsStore = useNovelsStore()
      const uiStore = useUIStore()
      if (!novelsStore.currentNovel) return null

      const chapterNumber = novelsStore.currentNovel.chapters.length + 1
      const newChapter = {
        id: Date.now().toString(),
        title: t('chapters.newChapterTitle', { number: chapterNumber }),
        content: '',
        wordCount: 0
      }

      novelsStore.currentNovel.chapters.push(newChapter)
      await novelsStore.saveNovels()
      uiStore.showSaveMessage(t('chapters.created'))
      
      // 触发自动摘要生成（新章节暂时跳过，因为内容为空）
      
      return newChapter
    },

    async deleteChapter(chapterId) {
      const novelsStore = useNovelsStore()
      const uiStore = useUIStore()
      if (!novelsStore.currentNovel) return false

      if (novelsStore.currentNovel.chapters.length <= 1) {
        throw new Error(t('chapters.atLeastOneChapter'))
      }

      const chapterIndex = novelsStore.currentNovel.chapters.findIndex(c => c.id === chapterId)
      if (chapterIndex === -1) return false

      novelsStore.currentNovel.chapters.splice(chapterIndex, 1)

      // If deleting current chapter, switch to first chapter
      if (this.currentChapter && this.currentChapter.id === chapterId) {
        this.currentChapter = novelsStore.currentNovel.chapters[0]
      }

      await novelsStore.saveNovels()
      uiStore.showSaveMessage(t('chapters.deleted'))
      return true
    },

    async updateChapterTitle(chapterId, newTitle) {
      const novelsStore = useNovelsStore()
      const uiStore = useUIStore()
      const chapter = this.chapters.find(c => c.id === chapterId)
      
      if (!chapter || !newTitle.trim()) return false

      chapter.title = newTitle.trim()
      await novelsStore.saveNovels()
      uiStore.showSaveMessage(t('chapters.titleUpdated'))
      return true
    },

    updateChapterContent(content) {
      if (!this.currentChapter) return

      this.currentChapter.content = content
      this.currentChapter.wordCount = content.length
    },

    async reorderChapters(draggedChapterId, targetChapterId, position) {
      const novelsStore = useNovelsStore()
      const uiStore = useUIStore()
      if (!novelsStore.currentNovel) return false

      const chapters = novelsStore.currentNovel.chapters
      const draggedIndex = chapters.findIndex(c => c.id === draggedChapterId)
      let targetIndex = chapters.findIndex(c => c.id === targetChapterId)

      if (draggedIndex === -1 || targetIndex === -1) return false

      const [draggedItem] = chapters.splice(draggedIndex, 1)
      
      // Recalculate target index after removal
      targetIndex = chapters.findIndex(c => c.id === targetChapterId)
      
      if (position === 'before') {
        chapters.splice(targetIndex, 0, draggedItem)
      } else {
        chapters.splice(targetIndex + 1, 0, draggedItem)
      }

      await novelsStore.saveNovels()
      uiStore.showSaveMessage(t('chapters.reordered'))
      return true
    },

    startAutoSave() {
      const uiStore = useUIStore()
      this.clearAutoSaveTimer()
      this.autoSaveTimer = setInterval(async () => {
        if (this.currentChapter) {
          const novelsStore = useNovelsStore()
          await novelsStore.saveNovels()
          uiStore.showSaveMessage(t('editor.autoSaveIndicator'))
          if(this.autoSaveCallback) {
            await this.autoSaveCallback()
          }
        }
      }, 5000) // 5秒自动保存一次
    },

    clearAutoSaveTimer() {
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer)
        this.autoSaveTimer = null
      }
    },

    clearCurrentChapter() {
      this.clearAutoSaveTimer()
      this.currentChapter = null
    },

    // Drag and drop state management
    setDraggedChapter(chapterId) {
      this.draggedChapterId = chapterId
    },

    clearDraggedChapter() {
      this.draggedChapterId = null
    }
  }
})