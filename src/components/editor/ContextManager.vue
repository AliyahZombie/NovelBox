<template>
  <div class="context-manager">
    <div class="manager-header">
      <h3 class="manager-title">
        <span class="title-icon">📝</span>
        {{ $t('contextManager.title') }}
      </h3>
      <div class="header-actions">
        <button 
          class="refresh-btn"
          @click="refreshProgress"
          :disabled="loading"
        >
          <span v-if="loading">{{ $t('common.loading') }}</span>
          <span v-else>{{ $t('common.refresh') }}</span>
        </button>
      </div>
    </div>

    <div class="manager-content">
      <!-- 进度概览 -->
      <div class="progress-overview">
        <div class="progress-stats">
          <div class="stat-item">
            <div class="stat-value">{{ progress.completed }}</div>
            <div class="stat-label">{{ $t('contextManager.completed') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ progress.processing }}</div>
            <div class="stat-label">{{ $t('contextManager.processing') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ progress.failed }}</div>
            <div class="stat-label">{{ $t('contextManager.failed') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ progress.pending }}</div>
            <div class="stat-label">{{ $t('contextManager.pending') }}</div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        
        <div class="progress-text">
          {{ progressPercentage }}% ({{ progress.completed }}/{{ progress.total }})
        </div>
      </div>

      <!-- 批量操作 -->
      <div class="batch-actions">
        <button 
          class="action-btn primary"
          @click="generateAllSummaries"
          :disabled="batchProcessing || progress.total === 0"
        >
          <span v-if="batchProcessing">{{ $t('contextManager.generating') }}</span>
          <span v-else>{{ $t('contextManager.generateAll') }}</span>
        </button>
        
        <button 
          class="action-btn secondary"
          @click="generateFullBookSummary"
          :disabled="fullBookProcessing || progress.completed === 0"
        >
          <span v-if="fullBookProcessing">{{ $t('contextManager.generating') }}</span>
          <span v-else>{{ $t('contextManager.generateFullBook') }}</span>
        </button>
      </div>

      <!-- 章节列表 -->
      <div class="chapters-list">
        <div class="list-header">
          <h4>{{ $t('contextManager.chaptersList') }}</h4>
          <div class="auto-summary-toggle">
            <label>
              <input 
                type="checkbox" 
                v-model="autoSummaryEnabled"
                @change="toggleAutoSummary"
              />
              {{ $t('contextManager.autoSummary') }}
            </label>
          </div>
        </div>
        
        <div class="chapters-items">
          <div 
            v-for="chapter in chaptersWithStatus" 
            :key="chapter.id"
            class="chapter-item"
            :class="{ 
              'status-completed': chapter.status === 'completed',
              'status-processing': chapter.status === 'processing',
              'status-failed': chapter.status === 'failed',
              'status-pending': chapter.status === 'pending'
            }"
          >
            <div class="chapter-info">
              <div class="chapter-title">{{ chapter.title }}</div>
              <div class="chapter-meta">
                <span class="word-count">{{ chapter.wordCount }} {{ $t('common.words') }}</span>
                <span class="status-badge" :class="'status-' + chapter.status">
                  {{ getStatusLabel(chapter.status) }}
                </span>
              </div>
            </div>
            
            <div class="chapter-actions">
              <button 
                v-if="chapter.status === 'completed'"
                class="action-btn small view"
                @click="viewSummary(chapter)"
              >
                {{ $t('contextManager.view') }}
              </button>
              
              <button 
                class="action-btn small generate"
                @click="generateSummary(chapter)"
                :disabled="chapter.status === 'processing'"
              >
                <span v-if="chapter.status === 'processing'">{{ $t('contextManager.generating') }}</span>
                <span v-else>{{ $t('contextManager.generate') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 全书摘要显示 -->
      <div v-if="fullBookSummary" class="full-book-summary">
        <div class="summary-header">
          <h4>{{ $t('contextManager.fullBookSummary') }}</h4>
          <button @click="fullBookSummary = null" class="close-btn">×</button>
        </div>
        <div class="summary-content">
          {{ fullBookSummary }}
        </div>
      </div>
    </div>

    <!-- 摘要查看弹窗 -->
    <div v-if="viewingSummary" class="summary-modal" @click="closeSummaryModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>{{ viewingSummary.title }} - {{ $t('contextManager.summary') }}</h4>
          <button @click="closeSummaryModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="summary-text">{{ viewingSummary.summary }}</div>
          <div class="summary-meta">
            <span>{{ $t('contextManager.lastUpdated') }}: {{ formatDate(viewingSummary.summaryUpdatedAt) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="regenerateSummary(viewingSummary)" class="action-btn primary">
            {{ $t('contextManager.regenerate') }}
          </button>
          <button @click="closeSummaryModal" class="action-btn secondary">
            {{ $t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useNovelsStore } from '@/stores/novels'
import { useChaptersStore } from '@/stores/chapters'
import { useUIStore } from '@/stores/ui'
import { contextManager } from '@/services/contextManager'
import { ElectronStorageService } from '@/services/electron'
import { useI18n } from 'vue-i18n'

export default {
  name: 'ContextManager',
  setup() {
    const { t } = useI18n()
    const novelsStore = useNovelsStore()
    const chaptersStore = useChaptersStore()
    const uiStore = useUIStore()
    
    const loading = ref(false)
    const batchProcessing = ref(false)
    const fullBookProcessing = ref(false)
    const autoSummaryEnabled = ref(true)
    const viewingSummary = ref(null)
    const fullBookSummary = ref(null)
    
    const progress = reactive({
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      pending: 0
    })

    const chaptersWithStatus = ref([])

    const progressPercentage = computed(() => {
      if (progress.total === 0) return 0
      return Math.round((progress.completed / progress.total) * 100)
    })

    // 获取状态标签
    const getStatusLabel = (status) => {
      const labels = {
        completed: t('contextManager.statusCompleted'),
        processing: t('contextManager.statusProcessing'),
        failed: t('contextManager.statusFailed'),
        pending: t('contextManager.statusPending')
      }
      return labels[status] || status
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString()
    }

    // 刷新进度
    const refreshProgress = async () => {
      if (!novelsStore.currentNovel || loading.value) return
      
      loading.value = true
      try {
        // 获取摘要进度
        const progressResult = await contextManager.getSummaryProgress(novelsStore.currentNovel.id)
        if (progressResult.success) {
          Object.assign(progress, progressResult.data)
        }

        // 获取章节列表和状态
        const indexResult = await ElectronStorageService.loadChapterIndex(novelsStore.currentNovel.id)
        if (indexResult.success) {
          const chapters = indexResult.data.chapters
          const chaptersWithStatusData = []

          for (const chapter of chapters) {
            const context = await contextManager.getChapterContext(novelsStore.currentNovel.id, chapter.id)
            chaptersWithStatusData.push({
              ...chapter,
              status: context?.aiProcessingStatus || 'pending',
              summary: context?.summary || '',
              summaryUpdatedAt: context?.summaryUpdatedAt || null
            })
          }

          chaptersWithStatus.value = chaptersWithStatusData
        }
      } catch (error) {
        console.error('刷新进度失败:', error)
        const errorMessage = error.message || t('contextManager.refreshError')
        const details = `刷新信息:\n小说ID: ${novelsStore.currentNovel?.id}\n小说标题: ${novelsStore.currentNovel?.title}\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `刷新进度失败: ${errorMessage}`,
          details
        )
      } finally {
        loading.value = false
      }
    }

    // 生成单个章节摘要
    const generateSummary = async (chapter) => {
      try {
        // 获取章节内容
        const chapterResult = await ElectronStorageService.loadChapter(novelsStore.currentNovel.id, chapter.id)
        if (!chapterResult.success) {
          throw new Error('无法加载章节内容')
        }

        const content = chapterResult.data.content
        const result = await contextManager.generateChapterSummary(
          novelsStore.currentNovel.id, 
          chapter.id, 
          content,
          { force: true }
        )

        if (result.success) {
          uiStore.showSaveMessage(result.message)
          await refreshProgress()
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('生成摘要失败:', error)
        // 显示更详细的错误信息，包括章节信息
        const chapterInfo = `章节: ${chapter.title} (ID: ${chapter.id})`
        const errorMessage = error.message || t('contextManager.generateError')
        const details = `${chapterInfo}\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `生成章节摘要失败: ${errorMessage}`,
          details
        )
      }
    }

    // 批量生成所有摘要
    const generateAllSummaries = async () => {
      if (batchProcessing.value) return
      
      batchProcessing.value = true
      try {
        const pendingChapters = chaptersWithStatus.value.filter(c => 
          c.status === 'pending' || c.status === 'failed'
        )

        for (const chapter of pendingChapters) {
          await generateSummary(chapter)
        }

        uiStore.showSaveMessage(t('contextManager.batchGenerateComplete'))
      } catch (error) {
        console.error('批量生成失败:', error)
        const errorMessage = error.message || t('contextManager.batchGenerateError')
        const details = `批量处理信息:\n总章节数: ${chaptersWithStatus.value.length}\n待处理章节数: ${pendingChapters.length}\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `批量生成摘要失败: ${errorMessage}`,
          details
        )
      } finally {
        batchProcessing.value = false
      }
    }

    // 生成全书摘要
    const generateFullBookSummary = async () => {
      if (fullBookProcessing.value) return
      
      fullBookProcessing.value = true
      try {
        const result = await contextManager.generateFullBookSummary(novelsStore.currentNovel.id)
        
        if (result.success) {
          fullBookSummary.value = result.data
          uiStore.showSaveMessage(result.message)
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('生成全书摘要失败:', error)
        const errorMessage = error.message || t('contextManager.fullBookGenerateError')
        const details = `全书信息:\n小说ID: ${novelsStore.currentNovel?.id}\n小说标题: ${novelsStore.currentNovel?.title}\n总章节数: ${progress.total}\n已完成摘要: ${progress.completed}\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `生成全书摘要失败: ${errorMessage}`,
          details
        )
      } finally {
        fullBookProcessing.value = false
      }
    }

    // 查看摘要
    const viewSummary = async (chapter) => {
      const context = await contextManager.getChapterContext(novelsStore.currentNovel.id, chapter.id)
      if (context && context.summary) {
        viewingSummary.value = {
          ...chapter,
          summary: context.summary,
          summaryUpdatedAt: context.summaryUpdatedAt
        }
      }
    }

    // 关闭摘要弹窗
    const closeSummaryModal = () => {
      viewingSummary.value = null
    }

    // 重新生成摘要
    const regenerateSummary = async (chapter) => {
      closeSummaryModal()
      await generateSummary(chapter)
    }

    // 切换自动摘要
    const toggleAutoSummary = () => {
      contextManager.setAutoSummaryEnabled(autoSummaryEnabled.value)
    }

    // 监听当前小说变化
    watch(() => novelsStore.currentNovel, refreshProgress, { immediate: true })

    onMounted(() => {
      autoSummaryEnabled.value = contextManager.isAutoSummaryEnabled()
      refreshProgress()
    })

    return {
      loading,
      batchProcessing,
      fullBookProcessing,
      autoSummaryEnabled,
      viewingSummary,
      fullBookSummary,
      progress,
      chaptersWithStatus,
      progressPercentage,
      getStatusLabel,
      formatDate,
      refreshProgress,
      generateSummary,
      generateAllSummaries,
      generateFullBookSummary,
      viewSummary,
      closeSummaryModal,
      regenerateSummary,
      toggleAutoSummary
    }
  }
}
</script>

<style scoped>
.context-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
}

.manager-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.manager-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.title-icon {
  font-size: 1.3rem;
}

.refresh-btn {
  padding: 6px 12px;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.manager-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.progress-overview {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.batch-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn.primary {
  background: var(--primary-color);
  color: white;
}

.action-btn.secondary {
  background: var(--secondary-color);
  color: white;
}

.action-btn.small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chapters-list {
  margin-bottom: 24px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.list-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.auto-summary-toggle label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.chapters-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.chapter-item:hover {
  background: var(--hover-bg);
}

.chapter-info {
  flex: 1;
}

.chapter-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.chapter-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.status-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
}

.status-badge.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-badge.status-processing {
  background: #fff3cd;
  color: #856404;
}

.status-badge.status-failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.status-pending {
  background: #e2e3e5;
  color: #6c757d;
}

.chapter-actions {
  display: flex;
  gap: 6px;
}

.full-book-summary {
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-content {
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.summary-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--sidebar-bg);
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.summary-text {
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.summary-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
