<template>
  <div class="main-editor">
    <EditorHeader 
      :has-unsaved-changes="hasUnsavedChanges"
      @go-home="goToHomepage"
      @manual-save="manualSave"
      @update-title="handleUpdateTitle"
    />
    
    <EditorContent
      ref="editorContentRef"
      @start-rewrite="handleStartRewrite"
      @content-change="handleContentChange"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelsStore, useChaptersStore, useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import EditorHeader from './EditorHeader.vue'
import EditorContent from './EditorContent.vue'

export default {
  name: 'MainEditor',
  components: {
    EditorHeader,
    EditorContent
  },
  emits: ['start-rewrite'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const router = useRouter()
    const novelsStore = useNovelsStore()
    const chaptersStore = useChaptersStore()
    const uiStore = useUIStore()
    
    const editorContentRef = ref(null)
    const hasUnsavedChanges = ref(false)
    let lastSavedContent = ''
    
    // 撤销/重做
    const historyStack = ref([])
    const historyIndex = ref(-1)
    const isUndoingOrRedoing = ref(false)
    const HISTORY_LIMIT = 100

    // 返回主页
    const goToHomepage = async () => {
      if (chaptersStore.currentChapter) {
        await novelsStore.saveNovels()
      }
      
      chaptersStore.clearCurrentChapter()
      novelsStore.clearCurrentNovel()
      router.push('/')
    }

    // 手动保存
    const manualSave = async () => {
      if (!novelsStore.currentNovel) return
      
      try {
        await novelsStore.saveNovels()
        lastSavedContent = chaptersStore.currentChapterContent
        hasUnsavedChanges.value = false
        uiStore.showSaveMessage(t('editor.manualSaveSuccess'))
      } catch (error) {
        console.error('手动保存失败:', error)
        alert('保存失败: ' + error.message)
      }
    }

    // 处理章节标题更新
    const handleUpdateTitle = async ({ chapterId, newTitle }) => {
      try {
        await chaptersStore.updateChapterTitle(chapterId, newTitle)
        // 更新保存状态
        lastSavedContent = chaptersStore.currentChapter.content
        hasUnsavedChanges.value = false
      } catch (error) {
        alert('更新标题失败: ' + error.message)
      }
    }

    // 处理内容变化
    const handleContentChange = (value) => {
      chaptersStore.updateChapterContent(value)
      hasUnsavedChanges.value = value !== lastSavedContent
    }

    // 处理重写开始
    const handleStartRewrite = (rewriteSession) => {
      emit('start-rewrite', rewriteSession)
    }

    const undo = () => {
      if (historyIndex.value > 0) {
        isUndoingOrRedoing.value = true
        historyIndex.value--
        chaptersStore.updateChapterContent(historyStack.value[historyIndex.value])
        nextTick(() => {
          isUndoingOrRedoing.value = false
        })
      }
    }

    const redo = () => {
      if (historyIndex.value < historyStack.value.length - 1) {
        isUndoingOrRedoing.value = true
        historyIndex.value++
        chaptersStore.updateChapterContent(historyStack.value[historyIndex.value])
        nextTick(() => {
          isUndoingOrRedoing.value = false
        })
      }
    }

    // 监听当前章节变化，更新编辑器内容
    watch(() => chaptersStore.currentChapter, (newChapter) => {
      if (newChapter) {
        // Content is automatically updated via computed property
        lastSavedContent = newChapter.content
        hasUnsavedChanges.value = false
        // 初始化撤销/重做历史
        historyStack.value = [newChapter.content || '']
        historyIndex.value = 0
      } else {
        historyStack.value = []
        historyIndex.value = -1
      }
    })
    
    // 监听自动保存事件，更新保存状态
    const handleAutoSave = () => {
      if (chaptersStore.currentChapter) {
        lastSavedContent = chaptersStore.currentChapter.content
        hasUnsavedChanges.value = false
      }
    }
    
    // 监听章节内容变化
    watch(() => chaptersStore.currentChapterContent, (newContent) => {
      if (isUndoingOrRedoing.value || newContent === undefined) return
      
      if (newContent !== lastSavedContent) {
        hasUnsavedChanges.value = true
      }

      // 如果新内容与历史记录中的当前内容相同，则不进行任何操作
      if (newContent === historyStack.value[historyIndex.value]) return

      // 如果在撤销后进行了新的编辑，则清除"未来"的历史记录
      if (historyIndex.value < historyStack.value.length - 1) {
        historyStack.value.splice(historyIndex.value + 1)
      }

      historyStack.value.push(newContent)

      // 保持历史记录堆栈的大小
      if (historyStack.value.length > HISTORY_LIMIT) {
        historyStack.value.shift()
      }
      historyIndex.value = historyStack.value.length - 1
    })

    // 添加键盘事件监听
    const handleKeyDown = (event) => {
      // 统一处理快捷键
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 's':
            event.preventDefault()
            manualSave()
            break
          case 'z':
            event.preventDefault()
            undo()
            break
          case 'y':
            event.preventDefault()
            redo()
            break
        }
      }
    }

    // 初始化自动保存定时器
    const initAutoSave = () => {
      if (chaptersStore.currentChapter) {
        chaptersStore.startAutoSave()
      }
    }

    const autoSaveCallback = async () => {
      hasUnsavedChanges.value = false
    }

    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown)
      chaptersStore.addAutoSaveCallback(autoSaveCallback)
      // 监听自动保存完成事件
      chaptersStore.$subscribe((mutation, state) => {
        // 当章节内容发生变化时，检查是否需要更新保存状态
        if (mutation.type === 'chapters' && mutation.payload?.type === 'AUTO_SAVE_COMPLETED') {
          handleAutoSave()
        }
      })
      // 初始化自动保存定时器
      initAutoSave()
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
      chaptersStore.clearAutoSaveTimer()
    })

    return {
      novelsStore,
      chaptersStore,
      uiStore,
      editorContentRef,
      hasUnsavedChanges,
      goToHomepage,
      manualSave,
      handleUpdateTitle,
      handleContentChange,
      handleStartRewrite
    }
  }
}
</script>

<style scoped>
.main-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--content-bg);
}
</style>