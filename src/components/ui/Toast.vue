<template>
  <Teleport to="body">
    <div v-if="visible" class="toast-container">
      <div 
        class="toast"
        :class="[`toast-${type}`, { 'toast-show': visible }]"
      >
        <div class="toast-icon">
          <span v-if="type === 'success'">✅</span>
          <span v-else-if="type === 'error'">❌</span>
          <span v-else-if="type === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="toast-content">
          <div class="toast-title" v-if="title">{{ title }}</div>
          <div class="toast-message">{{ message }}</div>
          <div v-if="details" class="toast-details">
            <button
              class="details-toggle"
              @click="showDetails = !showDetails"
            >
              {{ showDetails ? '隐藏详情' : '显示详情' }}
              <span class="toggle-icon" :class="{ 'rotated': showDetails }">▼</span>
            </button>
            <div v-if="showDetails" class="details-content">
              <pre>{{ details }}</pre>
            </div>
          </div>
        </div>
        <button class="toast-close" @click="close">×</button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Toast',
  props: {
    message: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
    },
    duration: {
      type: Number,
      default: 5000
    },
    autoClose: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const visible = ref(false)
    const showDetails = ref(false)
    let timer = null

    const show = () => {
      visible.value = true
      
      if (props.autoClose && props.duration > 0) {
        timer = setTimeout(() => {
          close()
        }, props.duration)
      }
    }

    const close = () => {
      visible.value = false
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      emit('close')
    }

    onMounted(() => {
      show()
    })

    return {
      visible,
      showDetails,
      close
    }
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  transform: translateX(100%);
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0;
}

.toast-show {
  transform: translateX(0);
  opacity: 1;
}

.toast-success {
  border-left: 4px solid #4caf50;
}

.toast-error {
  border-left: 4px solid #f44336;
}

.toast-warning {
  border-left: 4px solid #ff9800;
}

.toast-info {
  border-left: 4px solid #2196f3;
}

.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.toast-message {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.toast-details {
  margin-top: 8px;
}

.details-toggle {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.details-toggle:hover {
  opacity: 0.8;
}

.toggle-icon {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.details-content {
  margin-top: 8px;
  padding: 8px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.details-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 深色主题适配 */
.theme-dark .toast,
.theme-oled .toast {
  background: var(--sidebar-bg);
  border-color: var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
