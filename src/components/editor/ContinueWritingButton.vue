<template>
  <div class="continue-writing-button">
    <button 
      class="continue-btn"
      @click="startContinueWriting"
      :disabled="processing"
      :title="$t('editor.continueWriting.tooltip')"
    >
      <span class="btn-icon">✍️</span>
      <span class="btn-text">{{ processing ? $t('editor.continueWriting.processing') : $t('editor.continueWriting.title') }}</span>
    </button>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'ContinueWritingButton',
  emits: ['continue-writing'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const processing = ref(false)

    const startContinueWriting = () => {
      if (processing.value) return
      
      processing.value = true
      emit('continue-writing')
      
      // 重置状态（实际的处理完成会由父组件控制）
      setTimeout(() => {
        processing.value = false
      }, 1000)
    }

    return {
      processing,
      startContinueWriting
    }
  }
}
</script>

<style scoped>
.continue-writing-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
}

.continue-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary-color, #007bff);
  color: var(--primary-text-color, white);
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  min-width: 120px;
  justify-content: center;
}

.continue-btn:hover:not(:disabled) {
  background: var(--primary-color-hover, #0056b3);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--shadow-color, rgba(0, 0, 0, 0.2));
}

.continue-btn:active:not(:disabled) {
  transform: translateY(0);
}

.continue-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 1.1rem;
}

.btn-text {
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .continue-writing-button {
    bottom: 20px;
    right: 20px;
  }
  
  .continue-btn {
    padding: 10px 16px;
    font-size: 0.8rem;
    min-width: 100px;
  }
  
  .btn-icon {
    font-size: 1rem;
  }
}

/* 深色主题适配 */
.theme-dark .continue-btn,
.theme-oled .continue-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-dark .continue-btn:hover:not(:disabled),
.theme-oled .continue-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.continue-btn:disabled {
  animation: pulse 2s infinite;
}
</style>
