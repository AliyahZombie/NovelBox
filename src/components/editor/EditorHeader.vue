<template>
  <div class="editor-header">
    <div class="editor-header-left">
      <button class="back-btn" @click="goToHomepage">
        {{ $t('editor.backToHomepage') }}
      </button>
      <span class="current-novel-title">
        {{ novelsStore.currentNovelTitle }}
      </span>
    </div>
    
    <div class="editor-header-center">
      <div class="chapter-title-editor">
        <div class="chapter-title-divider"></div>
        <input 
          v-if="uiStore.editingChapterTitle"
          type="text" 
          v-model="editingTitle"
          class="chapter-title-input"
          :placeholder="$t('editor.chapterTitlePlaceholder')"
          @blur="finishEditingTitle"
          @keydown.enter="finishEditingTitle"
          @keydown.esc="cancelEditingTitle"
          ref="titleInput"
        >
        <span 
          v-else
          class="chapter-title-display"
          @click="startEditingTitle"
        >
          {{ chaptersStore.currentChapterTitle || $t('chapters.untitled') }}
        </span>
        <span v-if="hasUnsavedChanges" class="unsaved-indicator">{{ $t('editor.unsavedChanges') }}</span>
      </div>
    </div>
    
    <div class="editor-header-right">
      <span 
        v-show="uiStore.showSaveIndicator" 
        class="auto-save-indicator"
      >
        {{ uiStore.saveIndicatorMessage }}
      </span>
      <button class="save-btn" @click="manualSave" :title="$t('common.save')">
        💾 {{ $t('common.save') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNovelsStore, useChaptersStore, useUIStore } from '@/stores'

export default {
  name: 'EditorHeader',
  props: {
    hasUnsavedChanges: {
      type: Boolean,
      required: true
    }
  },
  emits: ['go-home', 'manual-save', 'update-title'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const novelsStore = useNovelsStore()
    const chaptersStore = useChaptersStore()
    const uiStore = useUIStore()
    
    const titleInput = ref(null)
    const editingTitle = ref('')

    // 返回主页
    const goToHomepage = () => {
      emit('go-home')
    }

    // 手动保存
    const manualSave = () => {
      emit('manual-save')
    }

    // 开始编辑章节标题
    const startEditingTitle = () => {
      if (!chaptersStore.currentChapter) return
      
      editingTitle.value = chaptersStore.currentChapter.title
      uiStore.startEditingChapterTitle()
      
      nextTick(() => {
        titleInput.value?.focus()
        titleInput.value?.select()
      })
    }

    // 完成编辑章节标题
    const finishEditingTitle = async () => {
      if (!chaptersStore.currentChapter) return
      
      const newTitle = editingTitle.value.trim()
      if (newTitle && newTitle !== chaptersStore.currentChapter.title) {
        emit('update-title', {
          chapterId: chaptersStore.currentChapter.id,
          newTitle: newTitle
        })
      }
      
      uiStore.stopEditingChapterTitle()
    }

    // 取消编辑章节标题
    const cancelEditingTitle = () => {
      uiStore.stopEditingChapterTitle()
      editingTitle.value = ''
    }

    return {
      novelsStore,
      chaptersStore,
      uiStore,
      titleInput,
      editingTitle,
      goToHomepage,
      manualSave,
      startEditingTitle,
      finishEditingTitle,
      cancelEditingTitle
    }
  }
}
</script>

<style scoped>
.editor-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  min-height: 70px;
}

.editor-header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.back-btn {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.current-novel-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.1em;
}

.editor-header-center {
  flex: 2;
  display: flex;
  justify-content: center;
}

.chapter-title-editor {
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 400px;
  width: 100%;
}

.chapter-title-divider {
  width: 40px;
  height: 2px;
  background: var(--accent-color);
  border-radius: 1px;
}

.chapter-title-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--accent-color);
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: 500;
  text-align: center;
  background: var(--input-bg);
  color: var(--text-primary);
}

.chapter-title-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-shadow);
}

.chapter-title-display {
  flex: 1;
  font-size: 1.2em;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.chapter-title-display:hover {
  background: var(--nav-hover-bg);
  color: var(--accent-color);
}

.unsaved-indicator {
  font-size: 0.8em;
  color: var(--text-secondary);
  font-style: italic;
  margin-left: 10px;
  vertical-align: middle;
}

.editor-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
}

.auto-save-indicator {
  font-size: 0.9em;
  color: #28a745;
  font-weight: 500;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.save-btn {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--accent-shadow);
}
</style>