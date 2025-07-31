<template>
  <div class="editor-content">
    <textarea 
      ref="editorTextarea"
      v-model="editorContent"
      class="chapter-editor" 
      :placeholder="$t('editor.startWriting')"
      @input="handleEditorInput"
      @mouseup="handleTextSelection"
      @keyup="handleTextSelection"
      @contextmenu="handleContextMenu"
    ></textarea>
    
    <!-- 右键菜单组件 -->
    <ContextMenu
      :visible="showContextMenu"
      :position="contextMenuPosition"
      :selected-text="selectedText"
      :textarea-ref="editorTextarea"
      @rewrite="handleRewrite"
      @hide="hideContextMenu"
    />
    
    <!-- 自定义提示模态框 -->
    <div v-if="showCustomPromptModal" class="modal-overlay" @click="hideCustomPromptModal">
      <div class="custom-prompt-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ $t('editor.rewriteTooltip.custom') }}</h3>
          <button class="modal-close" @click="hideCustomPromptModal">×</button>
        </div>
        
        <div class="modal-content">
          <textarea
            ref="customPromptTextarea"
            v-model="customPrompt"
            class="custom-prompt-textarea"
            :placeholder="$t('editor.rewriteTooltip.customPromptPlaceholder')"
            @keydown.ctrl.enter.exact.prevent="applyCustomPrompt"
            @keydown.esc="hideCustomPromptModal"
          ></textarea>

          <div class="modal-options">
            <label class="option-item">
              <input
                type="checkbox"
                v-model="includeFullContext"
              />
              <span>{{ $t('editor.rewriteTooltip.includeFullContext') }}</span>
            </label>
            <div class="option-desc">
              {{ $t('editor.rewriteTooltip.includeFullContextDesc') }}
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button 
            class="action-btn apply-btn" 
            @click="applyCustomPrompt"
            :disabled="!customPrompt.trim()"
          >
            {{ $t('editor.rewriteTooltip.apply') }}
          </button>
          <button 
            class="action-btn cancel-btn" 
            @click="hideCustomPromptModal"
          >
            {{ $t('editor.rewriteTooltip.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue'
import { useChaptersStore, useUIStore } from '@/stores'
import ContextMenu from './ContextMenu.vue'

export default {
  name: 'EditorContent',
  components: {
    ContextMenu
  },
  emits: ['start-rewrite', 'content-change'],
  setup(props, { emit }) {
    const chaptersStore = useChaptersStore()
    const uiStore = useUIStore()
    
    const editorTextarea = ref(null)
    const customPromptTextarea = ref(null)
    
    // 右键菜单相关状态
    const showContextMenu = ref(false)
    const showCustomPromptModal = ref(false)
    const customPrompt = ref('')
    const includeFullContext = ref(false)
    const selectedText = ref('')
    const selectionStart = ref(0)
    const selectionEnd = ref(0)
    const contextMenuPosition = ref({ x: 0, y: 0 })
    
    const editorContent = computed({
      get: () => chaptersStore.currentChapterContent,
      set: (value) => {
        emit('content-change', value)
      }
    })

    // 处理编辑器输入
    const handleEditorInput = () => {
      // Content is automatically updated via v-model
    }

    // 处理文本选择
    const handleTextSelection = () => {
      if (!editorTextarea.value) return
      
      const textarea = editorTextarea.value
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value.substring(start, end)
      
      // 更新选择状态
      if (text && text.trim().length > 0 && text.length <= 1000) {
        selectedText.value = text
        selectionStart.value = start
        selectionEnd.value = end
      } else {
        selectedText.value = ''
      }
    }

    // 处理右键菜单
    const handleContextMenu = (event) => {
      if (!editorTextarea.value) return
      
      const textarea = editorTextarea.value
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value.substring(start, end)
      
      // 只有选中文本时才显示右键菜单
      if (text && text.trim().length > 0 && text.length <= 1000) {
        event.preventDefault()
        
        selectedText.value = text
        selectionStart.value = start
        selectionEnd.value = end
        
        contextMenuPosition.value = {
          x: event.clientX,
          y: event.clientY
        }
        
        showContextMenu.value = true
      }
    }

    // 隐藏右键菜单
    const hideContextMenu = () => {
      showContextMenu.value = false
    }

    // 处理重写请求
    const handleRewrite = (type) => {
      if (type === 'custom') {
        showCustomPromptModal.value = true
        nextTick(() => {
          customPromptTextarea.value?.focus()
        })
      } else {
        startRewrite(type)
      }
    }

    // 开始重写
    const startRewrite = (type, customPromptText = '') => {
      console.log('开始重写:', type, customPromptText)
      if (!selectedText.value) return

      // 确保右侧面板展开
      if (uiStore.rightSidebarCollapsed) {
        uiStore.toggleRightSidebar()
      }

      // 创建重写会话并传递给父组件
      const rewriteSession = {
        type,
        originalText: selectedText.value,
        customPrompt: customPromptText,
        selectionStart: selectionStart.value,
        selectionEnd: selectionEnd.value,
        includeFullContext: includeFullContext.value
      }

      emit('start-rewrite', rewriteSession)
    }

    // 隐藏自定义提示模态框
    const hideCustomPromptModal = () => {
      showCustomPromptModal.value = false
      customPrompt.value = ''
      includeFullContext.value = false
    }

    // 应用自定义提示
    const applyCustomPrompt = () => {
      const promptText = customPrompt.value.trim()
      if (promptText) {
        console.log('应用自定义提示:', promptText)
        startRewrite('custom', promptText)
        hideCustomPromptModal()
      }
    }

    return {
      editorTextarea,
      customPromptTextarea,
      editorContent,
      showContextMenu,
      showCustomPromptModal,
      customPrompt,
      includeFullContext,
      selectedText,
      contextMenuPosition,
      handleEditorInput,
      handleTextSelection,
      handleContextMenu,
      hideContextMenu,
      handleRewrite,
      hideCustomPromptModal,
      applyCustomPrompt
    }
  }
}
</script>

<style scoped>
.editor-content {
  flex: 1;
  padding: 24px;
  overflow: hidden;
}

.chapter-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  background: transparent;
  resize: none;
  padding: 0;
}

.chapter-editor::placeholder {
  color: var(--text-secondary);
  font-style: italic;
}

/* 自定义滚动条 */
.chapter-editor::-webkit-scrollbar {
  width: 8px;
}

.chapter-editor::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

.chapter-editor::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.chapter-editor::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 在深色和OLED主题中调整滚动条样式 */
.theme-dark .chapter-editor::-webkit-scrollbar-track,
.theme-oled .chapter-editor::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.theme-dark .chapter-editor::-webkit-scrollbar-thumb,
.theme-oled .chapter-editor::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.theme-dark .chapter-editor::-webkit-scrollbar-thumb:hover,
.theme-oled .chapter-editor::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.custom-prompt-modal {
  background: var(--modal-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--card-hover-shadow);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.modal-content {
  padding: 20px;
}

.custom-prompt-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
}

.custom-prompt-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--sidebar-bg);
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  text-align: center;
}

.action-btn:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
  border-color: var(--accent-color);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.apply-btn {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border-color: transparent;
}

.apply-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.cancel-btn {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
}

.modal-options {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 8px;
}

.option-item input[type="checkbox"] {
  margin: 0;
}

.option-item span {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.option-desc {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.4;
  margin-left: 24px;
}
</style>