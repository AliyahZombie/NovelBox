import { defineStore } from 'pinia'
import toast from '@/services/toast'

export const useUIStore = defineStore('ui', {
  state: () => ({
    // Modal states
    showNewNovelModal: false,
    showEditNovelModal: false,
    editNovelData: null,
    
    // Sidebar states
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: true,
    
    // Edit states
    editingChapterTitle: false,
    
    // Save indicator
    showSaveIndicator: false,
    saveIndicatorMessage: '',
    
    // Storage path
    storagePath: '加载中...'
  }),

  actions: {
    // Modal actions
    openNewNovelModal() {
      this.showNewNovelModal = true
    },

    closeNewNovelModal() {
      this.showNewNovelModal = false
    },

    openEditNovelModal() {
      this.showEditNovelModal = true
    },

    closeEditNovelModal() {
      this.showEditNovelModal = false
    },

    // Sidebar actions
    toggleLeftSidebar() {
      this.leftSidebarCollapsed = !this.leftSidebarCollapsed
    },

    toggleRightSidebar() {
      this.rightSidebarCollapsed = !this.rightSidebarCollapsed
    },

    collapseLeftSidebar() {
      this.leftSidebarCollapsed = true
    },

    expandLeftSidebar() {
      this.leftSidebarCollapsed = false
    },

    collapseRightSidebar() {
      this.rightSidebarCollapsed = true
    },

    expandRightSidebar() {
      this.rightSidebarCollapsed = false
    },

    // Chapter title editing
    startEditingChapterTitle() {
      this.editingChapterTitle = true
    },

    stopEditingChapterTitle() {
      this.editingChapterTitle = false
    },

    // Save indicator
    showSaveMessage(message = '') {
      // 如果没有传入消息，则使用默认的自动保存消息
      this.saveIndicatorMessage = message || '已自动保存'
      this.showSaveIndicator = true

      setTimeout(() => {
        this.showSaveIndicator = false
      }, 2000)
    },

    // Error display
    showError(message, details = '') {
      // 使用Toast显示错误消息，包含详细信息
      toast.error(message, '错误', details)
      console.error('UI Error:', message, details ? `\nDetails: ${details}` : '')
    },

    // Success message
    showSuccess(message) {
      toast.success(message)
    },

    // Warning message
    showWarning(message) {
      toast.warning(message)
    },

    // Info message
    showInfo(message) {
      toast.info(message)
    },

    // Storage path
    async updateStoragePath() {
      try {
        const currentPath = await window.electronAPI.storage.getCurrentPath()
        this.storagePath = currentPath
        return currentPath
      } catch (error) {
        console.error('获取存储路径失败:', error)
        this.storagePath = '获取失败'
        throw error
      }
    },

    async selectStorageDirectory() {
      try {
        const selectedPath = await window.electronAPI.storage.selectDirectory()
        if (selectedPath) {
          this.storagePath = selectedPath
          return selectedPath
        }
      } catch (error) {
        console.error('选择存储目录失败:', error)
        this.storagePath = '获取失败'
        throw error
      }
    },

    async resetStorageDirectory() {
      try {
        const defaultPath = await window.electronAPI.storage.resetToDefault()
        this.storagePath = defaultPath
        return defaultPath
      } catch (error) {
        console.error('重置存储目录失败:', error)
        this.storagePath = '获取失败'
        throw error
      }
    }
  }
})