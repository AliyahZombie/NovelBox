<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="custom-prompt-modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ $t('editor.rewriteTooltip.custom') }}</h3>
        <button class="modal-close" @click="closeModal">×</button>
      </div>
      
      <div class="modal-content">
        <textarea
          ref="customPromptTextarea"
          v-model="localCustomPrompt"
          class="custom-prompt-textarea"
          :placeholder="$t('editor.rewriteTooltip.customPromptPlaceholder')"
          @keydown.ctrl.enter.exact.prevent="applyPrompt"
          @keydown.esc="closeModal"
        ></textarea>
      </div>
      
      <div class="modal-actions">
        <button 
          class="action-btn apply-btn" 
          @click="applyPrompt"
          :disabled="!localCustomPrompt.trim()"
        >
          {{ $t('editor.rewriteTooltip.apply') }}
        </button>
        <button 
          class="action-btn cancel-btn" 
          @click="closeModal"
        >
          {{ $t('editor.rewriteTooltip.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, watch } from 'vue'

export default {
  name: 'CustomPromptModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    customPrompt: {
      type: String,
      default: ''
    }
  },
  emits: ['update:customPrompt', 'apply', 'close'],
  setup(props, { emit }) {
    const customPromptTextarea = ref(null)
    const localCustomPrompt = ref(props.customPrompt)

    // 监听props变化
    watch(() => props.customPrompt, (newVal) => {
      localCustomPrompt.value = newVal
    })

    watch(() => props.visible, (newVal) => {
      if (newVal) {
        nextTick(() => {
          customPromptTextarea.value?.focus()
        })
      }
    })

    const closeModal = () => {
      emit('close')
    }

    const applyPrompt = () => {
      const promptText = localCustomPrompt.value.trim()
      if (promptText) {
        emit('apply', promptText)
      }
    }

    return {
      customPromptTextarea,
      localCustomPrompt,
      closeModal,
      applyPrompt
    }
  }
}
</script>

<style scoped>
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
</style>