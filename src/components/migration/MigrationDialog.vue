<template>
  <div class="migration-dialog-overlay" v-if="visible">
    <div class="migration-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">
          <span class="title-icon">🔄</span>
          {{ $t('migration.title') }}
        </h2>
      </div>

      <div class="dialog-content">
        <!-- 迁移说明 -->
        <div v-if="!migrationStarted" class="migration-info">
          <div class="info-section">
            <h3>{{ $t('migration.whyMigrate') }}</h3>
            <p>{{ $t('migration.whyMigrateDesc') }}</p>
          </div>

          <div class="info-section">
            <h3>{{ $t('migration.whatWillHappen') }}</h3>
            <ul>
              <li>{{ $t('migration.step1') }}</li>
              <li>{{ $t('migration.step2') }}</li>
              <li>{{ $t('migration.step3') }}</li>
              <li>{{ $t('migration.step4') }}</li>
            </ul>
          </div>

          <div class="info-section warning">
            <h3>{{ $t('migration.important') }}</h3>
            <p>{{ $t('migration.importantDesc') }}</p>
          </div>
        </div>

        <!-- 迁移进度 -->
        <div v-else class="migration-progress">
          <div class="progress-header">
            <h3>{{ $t('migration.inProgress') }}</h3>
            <div class="progress-stats">
              {{ migrationProgress.current }} / {{ migrationProgress.total }}
            </div>
          </div>

          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>

          <div class="progress-text">
            {{ progressPercentage }}% - {{ currentNovelTitle }}
          </div>

          <!-- 迁移日志 -->
          <div class="migration-log">
            <div class="log-header">{{ $t('migration.log') }}</div>
            <div class="log-content">
              <div 
                v-for="(entry, index) in migrationLog" 
                :key="index"
                class="log-entry"
                :class="'log-' + entry.status"
              >
                <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
                <span class="log-message">{{ entry.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 迁移完成 -->
        <div v-if="migrationCompleted" class="migration-result">
          <div class="result-header">
            <div class="result-icon" :class="migrationSuccess ? 'success' : 'error'">
              {{ migrationSuccess ? '✅' : '❌' }}
            </div>
            <h3>{{ migrationSuccess ? $t('migration.success') : $t('migration.failed') }}</h3>
          </div>

          <div class="result-details">
            <p v-if="migrationSuccess">
              {{ $t('migration.successDesc', { count: migrationResult.migratedCount, total: migrationResult.totalCount }) }}
            </p>
            <p v-else>
              {{ migrationResult.message || $t('migration.failedDesc') }}
            </p>
          </div>

          <div v-if="validationResult" class="validation-result">
            <h4>{{ $t('migration.validation') }}</h4>
            <p :class="validationResult.success ? 'success' : 'error'">
              {{ validationResult.message }}
            </p>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <!-- 开始迁移 -->
        <div v-if="!migrationStarted && !migrationCompleted" class="start-actions">
          <button 
            class="action-btn secondary"
            @click="$emit('cancel')"
          >
            {{ $t('common.cancel') }}
          </button>
          <button 
            class="action-btn primary"
            @click="startMigration"
            :disabled="migrating"
          >
            {{ $t('migration.startMigration') }}
          </button>
        </div>

        <!-- 迁移中 -->
        <div v-else-if="migrationStarted && !migrationCompleted" class="progress-actions">
          <button 
            class="action-btn secondary"
            @click="cancelMigration"
            :disabled="!canCancel"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>

        <!-- 迁移完成 -->
        <div v-else class="complete-actions">
          <button 
            v-if="!migrationSuccess"
            class="action-btn secondary"
            @click="retryMigration"
          >
            {{ $t('migration.retry') }}
          </button>
          <button 
            class="action-btn primary"
            @click="$emit('complete', migrationResult)"
          >
            {{ migrationSuccess ? $t('common.continue') : $t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { dataMigrationService } from '@/services/dataMigration'

export default {
  name: 'MigrationDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cancel', 'complete'],
  setup(props, { emit }) {
    const { t } = useI18n()
    
    const migrationStarted = ref(false)
    const migrationCompleted = ref(false)
    const migrating = ref(false)
    const migrationSuccess = ref(false)
    const canCancel = ref(true)
    
    const migrationProgress = ref({
      current: 0,
      total: 0
    })
    
    const currentNovelTitle = ref('')
    const migrationLog = ref([])
    const migrationResult = ref(null)
    const validationResult = ref(null)

    const progressPercentage = computed(() => {
      if (migrationProgress.value.total === 0) return 0
      return Math.round((migrationProgress.value.current / migrationProgress.value.total) * 100)
    })

    // 添加日志条目
    const addLogEntry = (message, status = 'info') => {
      migrationLog.value.push({
        timestamp: new Date(),
        message,
        status
      })
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      return timestamp.toLocaleTimeString()
    }

    // 开始迁移
    const startMigration = async () => {
      migrationStarted.value = true
      migrating.value = true
      migrationLog.value = []
      
      addLogEntry(t('migration.starting'))

      try {
        const result = await dataMigrationService.migrate((progress) => {
          migrationProgress.value = {
            current: progress.current,
            total: progress.total
          }
          
          currentNovelTitle.value = progress.novelTitle
          
          if (progress.status === 'success') {
            addLogEntry(t('migration.novelSuccess', { title: progress.novelTitle }), 'success')
          } else if (progress.status === 'error') {
            addLogEntry(t('migration.novelError', { title: progress.novelTitle, error: progress.error }), 'error')
          }
        })

        migrationResult.value = result
        migrationSuccess.value = result.success

        if (result.success) {
          addLogEntry(t('migration.completed'), 'success')
          
          // 验证迁移结果
          addLogEntry(t('migration.validating'))
          const validation = await dataMigrationService.validateMigration()
          validationResult.value = validation
          
          if (validation.success) {
            addLogEntry(t('migration.validationSuccess'), 'success')
          } else {
            addLogEntry(t('migration.validationFailed'), 'error')
          }
        } else {
          addLogEntry(t('migration.failed'), 'error')
        }
      } catch (error) {
        console.error('迁移过程出错:', error)
        migrationResult.value = {
          success: false,
          message: error.message
        }
        migrationSuccess.value = false
        addLogEntry(t('migration.error', { error: error.message }), 'error')
      } finally {
        migrating.value = false
        migrationCompleted.value = true
        canCancel.value = false
      }
    }

    // 取消迁移
    const cancelMigration = () => {
      if (canCancel.value) {
        emit('cancel')
      }
    }

    // 重试迁移
    const retryMigration = () => {
      migrationStarted.value = false
      migrationCompleted.value = false
      migrating.value = false
      migrationSuccess.value = false
      canCancel.value = true
      migrationProgress.value = { current: 0, total: 0 }
      currentNovelTitle.value = ''
      migrationLog.value = []
      migrationResult.value = null
      validationResult.value = null
    }

    // 重置状态
    const resetState = () => {
      migrationStarted.value = false
      migrationCompleted.value = false
      migrating.value = false
      migrationSuccess.value = false
      canCancel.value = true
      migrationProgress.value = { current: 0, total: 0 }
      currentNovelTitle.value = ''
      migrationLog.value = []
      migrationResult.value = null
      validationResult.value = null
    }

    // 监听visible变化，重置状态
    watch(() => props.visible, (newVisible) => {
      if (newVisible) {
        resetState()
      }
    })

    return {
      migrationStarted,
      migrationCompleted,
      migrating,
      migrationSuccess,
      canCancel,
      migrationProgress,
      currentNovelTitle,
      migrationLog,
      migrationResult,
      validationResult,
      progressPercentage,
      formatTime,
      startMigration,
      cancelMigration,
      retryMigration
    }
  }
}
</script>

<style scoped>
.migration-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.migration-dialog {
  background: var(--sidebar-bg);
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
}

.title-icon {
  font-size: 1.5rem;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.migration-info .info-section {
  margin-bottom: 24px;
}

.migration-info h3 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.migration-info p,
.migration-info li {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.migration-info ul {
  margin: 0;
  padding-left: 20px;
}

.warning {
  padding: 16px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
}

.warning h3 {
  color: #ff9800;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.progress-stats {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 24px;
}

.migration-log {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.log-header {
  padding: 12px 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  color: var(--text-primary);
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  background: var(--input-bg);
}

.log-entry {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.log-message {
  color: var(--text-primary);
}

.log-success .log-message {
  color: #4caf50;
}

.log-error .log-message {
  color: #f44336;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.result-icon {
  font-size: 2rem;
}

.result-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.result-details p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.validation-result {
  padding: 16px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.validation-result h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.validation-result .success {
  color: #4caf50;
}

.validation-result .error {
  color: #f44336;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
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

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
