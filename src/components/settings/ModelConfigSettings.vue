<template>
  <div class="settings-section">
    <h2 class="section-title">{{ $t('settings.aiFeatures.title') }}</h2>
    
    <!-- 文本重写模型配置 -->
    <div class="setting-item">
      <label class="setting-label">{{ $t('settings.aiFeatures.rewriteModel') }}</label>
      
      <div v-if="availableProviders.length === 0" class="no-providers-warning">
        {{ $t('settings.aiFeatures.noProvidersConfigured') }}
      </div>
      
      <div v-else class="model-config">
        <!-- 选择提供商 -->
        <div class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectProvider') }}</label>
          <select 
            v-model="rewriteConfig.provider" 
            class="setting-select"
            @change="onRewriteProviderChange"
          >
            <option value="">{{ $t('settings.aiFeatures.selectProvider') }}</option>
            <option 
              v-for="provider in availableProviders" 
              :key="provider.key"
              :value="provider.key"
            >
              {{ provider.name }} ({{ provider.type }})
            </option>
          </select>
        </div>

        <!-- 选择模型 -->
        <div v-if="rewriteConfig.provider" class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectModel') }}</label>
          <select 
            v-model="rewriteConfig.model" 
            class="setting-select"
            @change="saveRewriteConfig"
          >
            <option value="">{{ $t('settings.aiFeatures.selectModel') }}</option>
            <option 
              v-for="model in getModelsForProvider(rewriteConfig.provider)" 
              :key="model.id || model.name"
              :value="model.id || model.name"
            >
              {{ model.displayName || model.id || model.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 续写模型配置 -->
    <div class="setting-item">
      <label class="setting-label">{{ $t('settings.aiFeatures.continueModel') }}</label>
      
      <div v-if="availableProviders.length === 0" class="no-providers-warning">
        {{ $t('settings.aiFeatures.noProvidersConfigured') }}
      </div>
      
      <div v-else class="model-config">
        <!-- 选择提供商 -->
        <div class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectProvider') }}</label>
          <select 
            v-model="continueConfig.provider" 
            class="setting-select"
            @change="onContinueProviderChange"
          >
            <option value="">{{ $t('settings.aiFeatures.selectProvider') }}</option>
            <option 
              v-for="provider in availableProviders" 
              :key="provider.key"
              :value="provider.key"
            >
              {{ provider.name }} ({{ provider.type }})
            </option>
          </select>
        </div>

        <!-- 选择模型 -->
        <div v-if="continueConfig.provider" class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectModel') }}</label>
          <select 
            v-model="continueConfig.model" 
            class="setting-select"
            @change="saveContinueConfig"
          >
            <option value="">{{ $t('settings.aiFeatures.selectModel') }}</option>
            <option 
              v-for="model in getModelsForProvider(continueConfig.provider)" 
              :key="model.id || model.name"
              :value="model.id || model.name"
            >
              {{ model.displayName || model.id || model.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 概括模型配置 -->
    <div class="setting-item">
      <label class="setting-label">{{ $t('settings.aiFeatures.summaryModel') }}</label>
      
      <div v-if="availableProviders.length === 0" class="no-providers-warning">
        {{ $t('settings.aiFeatures.noProvidersConfigured') }}
      </div>
      
      <div v-else class="model-config">
        <!-- 选择提供商 -->
        <div class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectProvider') }}</label>
          <select 
            v-model="summaryConfig.provider" 
            class="setting-select"
            @change="onSummaryProviderChange"
          >
            <option value="">{{ $t('settings.aiFeatures.selectProvider') }}</option>
            <option 
              v-for="provider in availableProviders" 
              :key="provider.key"
              :value="provider.key"
            >
              {{ provider.name }} ({{ provider.type }})
            </option>
          </select>
        </div>

        <!-- 选择模型 -->
        <div v-if="summaryConfig.provider" class="config-field">
          <label class="field-label">{{ $t('settings.aiFeatures.selectModel') }}</label>
          <select 
            v-model="summaryConfig.model" 
            class="setting-select"
            @change="saveSummaryConfig"
          >
            <option value="">{{ $t('settings.aiFeatures.selectModel') }}</option>
            <option 
              v-for="model in getModelsForProvider(summaryConfig.provider)" 
              :key="model.id || model.name"
              :value="model.id || model.name"
            >
              {{ model.displayName || model.id || model.name }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { llmService } from '@/services'

// 配置对象
const rewriteConfig = ref({ provider: '', model: '' })
const continueConfig = ref({ provider: '', model: '' })
const summaryConfig = ref({ provider: '', model: '' })

const availableProviders = ref([])

// 获取指定提供商的可用模型
const getModelsForProvider = (providerKey) => {
  if (!providerKey) return []
  return llmService.getProviderModels(providerKey)
}

// 加载可用的提供商
const loadProviders = () => {
  availableProviders.value = llmService.getAvailableProviders()
}

// 加载已保存的配置
const loadSavedConfigs = () => {
  try {
    // 加载重写配置
    const rewriteConfigData = localStorage.getItem('novelbox-rewrite-config')
    if (rewriteConfigData) {
      const config = JSON.parse(rewriteConfigData)
      rewriteConfig.value = {
        provider: config.provider || '',
        model: config.model || ''
      }
    }

    // 加载续写配置
    const continueConfigData = localStorage.getItem('novelbox-continue-config')
    if (continueConfigData) {
      const config = JSON.parse(continueConfigData)
      continueConfig.value = {
        provider: config.provider || '',
        model: config.model || ''
      }
    }

    // 加载概括配置
    const summaryConfigData = localStorage.getItem('novelbox-summary-config')
    if (summaryConfigData) {
      const config = JSON.parse(summaryConfigData)
      summaryConfig.value = {
        provider: config.provider || '',
        model: config.model || ''
      }
    }
  } catch (error) {
    console.error('Failed to load AI configs:', error)
  }
}

// 保存重写配置
const saveRewriteConfig = () => {
  try {
    localStorage.setItem('novelbox-rewrite-config', JSON.stringify(rewriteConfig.value))
  } catch (error) {
    console.error('Failed to save rewrite config:', error)
  }
}

// 保存续写配置
const saveContinueConfig = () => {
  try {
    localStorage.setItem('novelbox-continue-config', JSON.stringify(continueConfig.value))
  } catch (error) {
    console.error('Failed to save continue config:', error)
  }
}

// 保存概括配置
const saveSummaryConfig = () => {
  try {
    localStorage.setItem('novelbox-summary-config', JSON.stringify(summaryConfig.value))
  } catch (error) {
    console.error('Failed to save summary config:', error)
  }
}

// 提供商变更处理
const onRewriteProviderChange = () => {
  rewriteConfig.value.model = ''
  saveRewriteConfig()
}

const onContinueProviderChange = () => {
  continueConfig.value.model = ''
  saveContinueConfig()
}

const onSummaryProviderChange = () => {
  summaryConfig.value.model = ''
  saveSummaryConfig()
}

onMounted(() => {
  loadProviders()
  loadSavedConfigs()
  
  // 监听提供商变化，重新加载
  window.addEventListener('storage', (e) => {
    if (e.key === 'novelbox-providers') {
      llmService.reloadProviders()
      loadProviders()
    }
  })
})
</script>

<style scoped>
.settings-section {
  max-width: 800px;
}

.section-title {
  margin: 0 0 24px 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.setting-item {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
}

.setting-label {
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--text-primary);
  font-size: 1rem;
}

.no-providers-warning {
  padding: 16px;
  background: var(--warning-bg);
  color: var(--warning-color);
  border: 1px solid var(--warning-border);
  border-radius: 6px;
  font-size: 0.9rem;
}

.model-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.setting-select {
  width: 300px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.2s;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}

.setting-select:hover {
  border-color: var(--accent-color);
}

/* 警告样式变量定义 */
:root {
  --warning-bg: #fff3cd;
  --warning-color: #856404;
  --warning-border: #ffeaa7;
}

.theme-dark {
  --warning-bg: #2d2111;
  --warning-color: #ffecb3;
  --warning-border: #5d4e37;
}

.theme-oled {
  --warning-bg: #1a1600;
  --warning-color: #ffecb3;
  --warning-border: #3d3000;
}
</style>