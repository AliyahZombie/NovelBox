<template>
  <div class="ai-panel">
    <div class="panel-header">
      <h2 class="panel-title">
        <span class="ai-icon">🤖</span>
        {{ $t('editor.aiPanel.title') }}
      </h2>
    </div>
    
    <div class="panel-content">
      <!-- AI重写结果显示区域 -->
      <div v-if="rewriteSession" class="rewrite-session">
        <div class="session-header">
          <div class="session-title">
            <span class="session-icon">✨</span>
            {{ getRewriteTypeLabel(rewriteSession.type) }}
          </div>
          <button class="close-session-btn" @click="closeRewriteSession">
            ×
          </button>
        </div>
        
        <!-- 原文显示 -->
        <div class="original-text-section">
          <div class="section-label">{{ $t('editor.aiPanel.originalText') }}</div>
          <div class="original-text">{{ rewriteSession.originalText }}</div>
        </div>
        
        <!-- 重写结果显示 -->
        <div class="rewrite-result-section">
          <div class="section-label">
            {{ $t('editor.aiPanel.rewriteResult') }}
            <span v-if="isStreaming" class="streaming-indicator">
              {{ $t('editor.aiPanel.generating') }}
              <span class="dots">...</span>
            </span>
          </div>
          
          <div class="rewrite-result">
            <div class="result-text" v-html="formatRewriteText(displayText)"></div>
            
            <!-- 流式输出光标 -->
            <span v-if="isStreaming" class="streaming-cursor">|</span>
          </div>
          
          <!-- 错误信息 -->
          <div v-if="rewriteError" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ rewriteError }}
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div v-if="!isStreaming && displayText && !rewriteError" class="action-buttons">
          <button class="action-btn replace-btn" @click="replaceText">
            <span class="btn-icon">✅</span>
            {{ $t('editor.aiPanel.replace') }}
          </button>
          <button class="action-btn retry-btn" @click="retryRewrite">
            <span class="btn-icon">🔄</span>
            {{ $t('editor.aiPanel.retry') }}
          </button>
        </div>
        
        <!-- 进一步要求输入 -->
        <div v-if="!isStreaming && displayText && !rewriteError" class="further-request">
          <div class="section-label">{{ $t('editor.aiPanel.furtherRequest') }}</div>
          <textarea 
            v-model="furtherPrompt"
            class="further-prompt-input"
            :placeholder="$t('editor.aiPanel.furtherPromptPlaceholder')"
            @keydown.ctrl.enter="applyFurtherRequest"
          ></textarea>
          <button 
            class="action-btn apply-further-btn" 
            @click="applyFurtherRequest"
            :disabled="!furtherPrompt.trim() || isStreaming"
          >
            <span class="btn-icon">🚀</span>
            {{ $t('editor.aiPanel.applyFurther') }}
          </button>
        </div>
      </div>

      <!-- AI续写结果显示区域 -->
      <div v-else-if="continueSession" class="continue-session">
        <div class="session-header">
          <div class="session-title">
            <span class="session-icon">✍️</span>
            {{ $t('editor.continueWriting.title') }}
          </div>
          <button class="close-session-btn" @click="closeContinueSession">
            ×
          </button>
        </div>

        <!-- 续写结果显示 -->
        <div class="continue-result-section">
          <div class="section-label">{{ $t('editor.continueWriting.result') }}</div>
          <div class="continue-result">
            <div v-if="isStreaming" class="streaming-indicator">
              <span class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {{ $t('editor.aiPanel.generating') }}
            </div>
            <div v-else-if="rewriteError" class="error-message">
              {{ rewriteError }}
            </div>
            <div v-else class="result-text">{{ formatRewriteText(displayText) }}</div>
          </div>
        </div>

        <!-- 续写操作按钮 -->
        <div class="session-actions">
          <button
            class="action-btn primary"
            @click="appendText"
            :disabled="isStreaming || !displayText || rewriteError"
          >
            <span class="btn-icon">📝</span>
            {{ $t('editor.continueWriting.append') }}
          </button>
          <button
            class="action-btn secondary"
            @click="retryContinue"
            :disabled="isStreaming"
          >
            <span class="btn-icon">🔄</span>
            {{ $t('common.retry') }}
          </button>
        </div>
      </div>

      <!-- 默认状态 - 无重写会话时显示AI功能面板 -->
      <div v-else class="ai-features-panel">
        <div class="features-tabs">
          <button
            v-for="tab in featureTabs"
            :key="tab.key"
            class="feature-tab"
            :class="{ active: activeFeatureTab === tab.key }"
            @click="activeFeatureTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <div class="feature-content">
          <!-- 上下文管理器 -->
          <div v-if="activeFeatureTab === 'context'" class="feature-section">
            <ContextManager />
          </div>

          <!-- 世界书编辑器 -->
          <div v-if="activeFeatureTab === 'worldbook'" class="feature-section">
            <WorldBookEditor />
          </div>

          <!-- AI设置 -->
          <div v-if="activeFeatureTab === 'settings'" class="feature-section">
            <div class="settings-content">
              <h4>{{ $t('aiPanel.settings.title') }}</h4>
              <div class="setting-group">
                <label>{{ $t('aiPanel.settings.autoSummary') }}</label>
                <div class="setting-control">
                  <input
                    type="checkbox"
                    v-model="autoSummaryEnabled"
                    @change="toggleAutoSummary"
                  />
                  <span>{{ $t('aiPanel.settings.autoSummaryDesc') }}</span>
                </div>
              </div>

              <div class="setting-group">
                <label>{{ $t('aiPanel.settings.includeFullContext') }}</label>
                <div class="setting-control">
                  <input
                    type="checkbox"
                    v-model="includeFullContextDefault"
                    @change="saveSettings"
                  />
                  <span>{{ $t('aiPanel.settings.includeFullContextDesc') }}</span>
                </div>
              </div>

              <div class="setting-group">
                <label>{{ $t('aiPanel.settings.alwaysIncludeWorldBook') }}</label>
                <div class="setting-control">
                  <input
                    type="checkbox"
                    v-model="alwaysIncludeWorldBook"
                    @change="saveSettings"
                  />
                  <span>{{ $t('aiPanel.settings.alwaysIncludeWorldBookDesc') }}</span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'
import { useUIStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { llmService, LLMRequest } from '@/services'
import ContextManager from './ContextManager.vue'
import WorldBookEditor from './WorldBookEditor.vue'
import { contextManager } from '@/services/contextManager'
import { ElectronStorageService } from '@/services/electron'

export default {
  name: 'AIPanel',
  components: {
    ContextManager,
    WorldBookEditor
  },
  props: {
    rewriteSession: {
      type: Object,
      default: null
    },
    continueSession: {
      type: Object,
      default: null
    }
  },
  emits: ['replace-text', 'close-session', 'append-text'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const uiStore = useUIStore()

    const displayText = ref('')
    const isStreaming = ref(false)
    const rewriteError = ref('')
    const furtherPrompt = ref('')

    // AI功能面板相关
    const activeFeatureTab = ref('context')
    const autoSummaryEnabled = ref(true)
    const includeFullContextDefault = ref(false)
    const alwaysIncludeWorldBook = ref(true)

    const featureTabs = computed(() => [
      { key: 'context', label: t('aiPanel.tabs.context'), icon: '📝' },
      { key: 'worldbook', label: t('aiPanel.tabs.worldbook'), icon: '🌍' },
      { key: 'settings', label: t('aiPanel.tabs.settings'), icon: '⚙️' }
    ])
    
    const startRewrite = async () => {
      console.log('=== startRewrite called ===')
      console.log('Rewrite session:', props.rewriteSession)
      
      if (!props.rewriteSession) {
        console.warn('No rewrite session provided')
        return
      }
      
      displayText.value = ''
      isStreaming.value = true
      rewriteError.value = ''
      
      try {
        const config = getRewriteConfig()
        console.log('Rewrite config:', config)
        if (!config) {
          throw new Error(t('editor.rewriteTooltip.noModelConfigured'))
        }
        
        const prompt = await generatePrompt(
          props.rewriteSession.type,
          props.rewriteSession.originalText,
          props.rewriteSession.customPrompt || ''
        )
        console.log('Rewrite prompt:', prompt)
        console.log('Rewrite prompt length:', prompt.length)
        
        const request = new LLMRequest({
          prompt: prompt,
          maxTokens: 2000,
          temperature: 0.7,
          stream: true
        })
        
        console.log('LLM request:', request)
        
        const response = await llmService.generateStreamContent(
          config.provider,
          config.model,
          request,
          (chunk) => {
            if (chunk.delta) {
              displayText.value += chunk.delta
            }
          }
        )
        
        console.log('LLM response:', response)
        
        if (!response.success) {
          throw new Error(response.error || 'Unknown error')
        }
        
      } catch (error) {
        console.error('Rewrite failed:', error)
        rewriteError.value = error.message || 'Unknown error'
      } finally {
        isStreaming.value = false
      }
    }
    
    const getRewriteConfig = () => {
      try {
        const savedConfig = localStorage.getItem('novelbox-rewrite-config')
        console.log('Rewrite config from localStorage:', savedConfig)
        if (!savedConfig) {
          console.warn('No rewrite config found in localStorage')
          return null
        }
        
        const config = JSON.parse(savedConfig)
        console.log('Parsed rewrite config:', config)
        if (!config.provider || !config.model) {
          console.warn('Invalid rewrite config - missing provider or model:', config)
          return null
        }
        
        return config
      } catch (error) {
        console.error('Failed to load rewrite config:', error)
        return null
      }
    }

    const getContinueConfig = () => {
      try {
        const savedConfig = localStorage.getItem('novelbox-continue-config')
        if (!savedConfig) {
          console.warn('No continue config found in localStorage')
          return null
        }
        
        const config = JSON.parse(savedConfig)
        if (!config.provider || !config.model) {
          console.warn('Invalid continue config - missing provider or model:', config)
          return null
        }
        
        return config
      } catch (error) {
        console.error('Failed to load continue config:', error)
        return null
      }
    }

    const getSummaryConfig = () => {
      try {
        const savedConfig = localStorage.getItem('novelbox-summary-config')
        if (!savedConfig) {
          console.warn('No summary config found in localStorage')
          return null
        }
        
        const config = JSON.parse(savedConfig)
        if (!config.provider || !config.model) {
          console.warn('Invalid summary config - missing provider or model:', config)
          return null
        }
        
        return config
      } catch (error) {
        console.error('Failed to load summary config:', error)
        return null
      }
    }
    
    const generatePrompt = async (type, text, customPromptText = '') => {
      console.log('=== generatePrompt called ===')
      console.log('Type:', type)
      console.log('Text:', text)
      console.log('Custom prompt text:', customPromptText)

      // 获取当前章节完整内容作为上下文
      const chapterContext = await getChapterContext()
      console.log('Chapter context:', chapterContext)

      // 检查是否需要包含全本概括
      const includeFullContext = includeFullContextDefault.value ||
        (props.rewriteSession && props.rewriteSession.includeFullContext)

      let contextInfo = ''

       // 添加章节标题信息
      if (chapterContext.chapterTitle) {
        contextInfo += `\n\n【当前章节】：${chapterContext.chapterTitle}\n`
        console.log('添加了章节标题信息')
      }

      // 添加章节上下文
      if (chapterContext.fullContent && chapterContext.fullContent !== text) {
        contextInfo += `\n\n【章节完整内容作为上下文参考】：\n${chapterContext.fullContent}\n`
      }

      // 添加全本概括
      if (includeFullContext && chapterContext.fullBookSummary) {
        contextInfo += `\n\n【全书概括】：\n${chapterContext.fullBookSummary}\n`
      }

      // 添加世界书信息（总是包含）
      if (chapterContext.worldBook) {
        const worldInfo = formatWorldBookInfo(chapterContext.worldBook)
        if (worldInfo) {
          contextInfo += `\n\n【世界观设定】：\n${worldInfo}\n`
        }
      }

      const basePrompts = {
        expand: `直接输出结果，不要任何助手提示：请扩写以下文本，增加更多细节、描述和内容，但保持原有的风格和意思。${contextInfo ? '请参考提供的上下文信息，确保内容连贯性和一致性。' : ''}\n\n【需要扩写的文本】：\n${text}${contextInfo}`,
        contract: `直接输出结果，不要任何助手提示：请缩写以下文本，保留核心内容和关键信息，使其更加简洁。${contextInfo ? '请参考提供的上下文信息，确保内容连贯性。' : ''}\n\n【需要缩写的文本】：\n${text}${contextInfo}`,
        beautify: `直接输出结果，不要任何助手提示：请优化以下文本的文笔，改进语言表达（如增加修辞、使用高级词汇或增加成语使用）、增强可读性，但保持原意不变。${contextInfo ? '请参考提供的上下文信息，确保风格一致性。' : ''}\n\n【需要优化的文本】：\n${text}${contextInfo}`,
        custom: customPromptText ? `直接输出结果，不要任何助手提示：${customPromptText}${contextInfo ? '\n\n请参考以下上下文信息：' : ''}\n\n【目标文本】：\n${text}${contextInfo}` : text
      }

      const prompt = basePrompts[type] || text
      console.log('Generated prompt:', prompt)
      return prompt
    }

    const generateContinuePrompt = async (currentContent, chapterContent) => {
      console.log('=== generateContinuePrompt 调试信息 ===')
      console.log('currentContent长度:', currentContent?.length || 0)
      console.log('chapterContent长度:', chapterContent?.length || 0)

      // 获取章节上下文信息
      const chapterContext = await getChapterContext()
      console.log('章节上下文:', chapterContext)

      let contextInfo = ''

      // 添加章节标题信息
      if (chapterContext.chapterTitle) {
        contextInfo += `\n\n【当前章节】：${chapterContext.chapterTitle}\n`
        console.log('添加了章节标题信息')
      }

      // 总是添加世界书信息（包含人物信息）
      if (chapterContext.worldBook) {
        const worldInfo = formatWorldBookInfo(chapterContext.worldBook)
        if (worldInfo) {
          contextInfo += `\n\n【世界观设定】：\n${worldInfo}\n`
          console.log('添加了世界书信息')
        }
      }

      // 添加全本概括
      if (chapterContext.fullBookSummary) {
        contextInfo += `\n\n【全书概括】：\n${chapterContext.fullBookSummary}\n`
        console.log('添加了全书概括')
      }

      // 添加完整的章节内容作为上下文
      if (chapterContext.fullContent && chapterContext.fullContent !== currentContent) {
        contextInfo += `\n\n【章节完整内容】：\n${chapterContext.fullContent}\n`
        console.log('添加了章节完整内容')
      }

      const prompt = `请根据以下内容继续写作，保持风格一致，情节自然流畅。续写长度约200-500字。

要求：
1. 保持与前文的风格和语调一致
2. 情节发展要自然合理
3. 人物行为符合设定
4. 注意世界观的一致性
5. 直接输出续写内容，不要重复已有内容
6. 不要任何说明或前缀

${contextInfo}

【当前内容】：
${currentContent}

【请从这里继续写作，不要重复上面的内容】：`

      console.log('生成的提示词长度:', prompt.length)
      console.log('提示词预览:', prompt.substring(0, 300))

      return prompt
    }
    
    const getRewriteTypeLabel = (type) => {
      const labels = {
        expand: t('editor.rewriteTooltip.expand'),
        contract: t('editor.rewriteTooltip.contract'),
        beautify: t('editor.rewriteTooltip.beautify'),
        custom: t('editor.rewriteTooltip.custom')
      }
      return labels[type] || type
    }
    
    const formatRewriteText = (text) => {
      return text.replace(/\n/g, '<br>')
    }
    
    const replaceText = () => {
      if (displayText.value && props.rewriteSession) {
        emit('replace-text', {
          originalText: props.rewriteSession.originalText,
          newText: displayText.value.trim(),
          selectionStart: props.rewriteSession.selectionStart,
          selectionEnd: props.rewriteSession.selectionEnd
        })
        closeRewriteSession()
      }
    }
    
    const retryRewrite = () => {
      startRewrite()
    }
    
    const applyFurtherRequest = () => {
      if (!furtherPrompt.value.trim()) return
      
      // 创建新的重写会话，基于当前结果进行进一步处理
      const newSession = {
        ...props.rewriteSession,
        type: 'custom',
        customPrompt: furtherPrompt.value,
        originalText: displayText.value // 使用当前重写结果作为新的原文
      }
      
      // 重置进一步要求输入
      furtherPrompt.value = ''
      
      // 更新会话并重新开始重写
      Object.assign(props.rewriteSession, newSession)
      startRewrite()
    }
    
    const closeRewriteSession = () => {
      emit('close-session')
    }

    // 续写相关方法
    const closeContinueSession = () => {
      emit('close-session')
    }

    const appendText = () => {
      console.log('=== AIPanel appendText 调试信息 ===')
      console.log('displayText.value:', displayText.value)
      console.log('displayText类型:', typeof displayText.value)
      console.log('isStreaming:', isStreaming.value)
      console.log('rewriteError:', rewriteError.value)

      if (displayText.value && !isStreaming.value && !rewriteError.value) {
        console.log('准备emit append-text:', displayText.value)
        emit('append-text', displayText.value)
        emit('close-session')
      } else {
        console.error('appendText 条件不满足:', {
          hasDisplayText: !!displayText.value,
          isStreaming: isStreaming.value,
          hasError: !!rewriteError.value
        })
      }
    }

    const retryContinue = () => {
      if (!isStreaming.value) {
        startContinue()
      }
    }

    const startContinue = async () => {
      console.log('=== startContinue 调试信息 ===')
      console.log('continueSession:', props.continueSession)

      if (!props.continueSession) {
        console.error('没有续写会话')
        return
      }

      try {
        displayText.value = ''
        isStreaming.value = true
        rewriteError.value = null

        console.log('开始生成续写提示词...')
        const prompt = await generateContinuePrompt(
          props.continueSession.currentContent,
          props.continueSession.chapterContent
        )

        console.log('续写提示词生成完成，长度:', prompt.length)

        // 获取续写AI配置
        const aiConfig = getContinueConfig()
        console.log('Continue config:', aiConfig)
        const config = aiConfig || getRewriteConfig() || { provider: 'openai', model: 'gpt-3.5-turbo' }

        console.log('最终使用的AI配置:', config)

        const { LLMRequest } = await import('@/services')
        const llmRequest = new LLMRequest({
          prompt,
          maxTokens: 1000,
          temperature: 0.8,
          stream: false // 先改为非流式，避免流式处理的问题
        })

        console.log('调用LLM服务...')
        const response = await llmService.generateContent(
          config.provider,
          config.model,
          llmRequest
        )

        console.log('LLM响应:', response)

        if (response.success) {
          let content = response.content || response.data || ''
          console.log('原始续写内容:', content)

          // 检查并移除重复的原始内容
          const originalContent = props.continueSession.currentContent
          if (content.startsWith(originalContent)) {
            content = content.substring(originalContent.length).trim()
            console.log('移除重复内容后:', content)
          }

          // 如果内容为空，说明AI没有生成新内容
          if (!content) {
            throw new Error('AI没有生成新的续写内容')
          }

          displayText.value = content
        } else {
          throw new Error(response.error || '续写失败')
        }
      } catch (error) {
        console.error('续写失败:', error)
        rewriteError.value = error.message
      } finally {
        isStreaming.value = false
      }
    }

    // AI功能面板方法
    const toggleAutoSummary = () => {
      contextManager.setAutoSummaryEnabled(autoSummaryEnabled.value)
    }

    const saveSettings = () => {
      // 保存设置到本地存储或配置文件
      localStorage.setItem('includeFullContextDefault', includeFullContextDefault.value.toString())
      localStorage.setItem('alwaysIncludeWorldBook', alwaysIncludeWorldBook.value.toString())
    }

    // 初始化设置
    const initSettings = () => {
      autoSummaryEnabled.value = contextManager.isAutoSummaryEnabled()
      const savedSetting = localStorage.getItem('includeFullContextDefault')
      if (savedSetting !== null) {
        includeFullContextDefault.value = savedSetting === 'true'
      }
      const savedWorldBookSetting = localStorage.getItem('alwaysIncludeWorldBook')
      if (savedWorldBookSetting !== null) {
        alwaysIncludeWorldBook.value = savedWorldBookSetting === 'true'
      }
    }

    // 监听重写会话变化，自动开始重写
    watch(() => props.rewriteSession, (newSession) => {
      if (newSession) {
        nextTick(() => {
          startRewrite()
        })
      }
    }, { immediate: true })

    // 监听续写会话变化，自动开始续写
    watch(() => props.continueSession, (newSession) => {
      if (newSession) {
        nextTick(() => {
          startContinue()
        })
      }
    }, { immediate: true })

    // 获取章节上下文信息
    const getChapterContext = async () => {
      console.log('=== getChapterContext called ===')
      const { useNovelsStore } = await import('@/stores/novels')
      const { useChaptersStore } = await import('@/stores/chapters')
      const novelsStore = useNovelsStore()
      const chaptersStore = useChaptersStore()

      console.log('Current novel:', novelsStore.currentNovel)
      console.log('Current chapter:', chaptersStore.currentChapter)

      if (!novelsStore.currentNovel || !chaptersStore.currentChapter) {
        console.warn('Missing novel or chapter data')
        return {}
      }

      const context = {
        chapterTitle: chaptersStore.currentChapter.title || '',
        fullContent: chaptersStore.currentChapter.content || '',
        fullBookSummary: null,
        worldBook: null
      }

      console.log('Base context:', context)

      try {
        // 获取全本概括（可选）
        if (includeFullContextDefault.value) {
          console.log('Generating full book summary...')
          const summaryResult = await contextManager.generateFullBookSummary(novelsStore.currentNovel.id)
          console.log('Summary result:', summaryResult)
          if (summaryResult.success) {
            context.fullBookSummary = summaryResult.data
            console.log('Full book summary:', context.fullBookSummary)
          }
        }

        // 总是获取世界书
        console.log('Loading world book for novel:', novelsStore.currentNovel.id)
        const worldBookResult = await ElectronStorageService.loadWorldBook(novelsStore.currentNovel.id)
        console.log('World book result:', worldBookResult)
        if (worldBookResult.success && worldBookResult.data) {
          context.worldBook = worldBookResult.data
          console.log('World book:', context.worldBook)
        }
      } catch (error) {
        console.error('获取章节上下文失败:', error)
      }

      console.log('Final context:', context)
      return context
    }

    // 格式化世界书信息
    const formatWorldBookInfo = (worldBook) => {
      console.log('=== formatWorldBookInfo 调试信息 ===')
      console.log('worldBook:', worldBook)

      if (!worldBook || !worldBook.settings) {
        console.log('世界书或设置为空')
        return ''
      }

      const parts = []
      const settings = worldBook.settings
      console.log('settings:', settings)

      // 世界设定
      if (settings.world && settings.world.name) {
        parts.push(`世界名称：${settings.world.name}`)
        if (settings.world.description) {
          parts.push(`世界描述：${settings.world.description}`)
        }
        if (settings.world.rules && settings.world.rules.length > 0) {
          parts.push(`世界规则：${settings.world.rules.join('；')}`)
        }
        console.log('添加了世界设定')
      }

      // 主要人物
      console.log('检查人物信息:', settings.characters)
      if (settings.characters && settings.characters.length > 0) {
        console.log('人物数量:', settings.characters.length)
        const characterInfo = settings.characters
          .filter(c => c.name)
          .map(c => {
            console.log('处理人物:', c)
            console.log('人物特征:', c.traits)
            let info = `${c.name}：${c.description || ''}`
            if (c.example) {
              info += `\n描写示例：${c.example}`
            }
            if (c.traits && Array.isArray(c.traits) && c.traits.length > 0) {
              const traitsText = c.traits.filter(t => t && t.trim()).join('、')
              if (traitsText) {
                info += `\n特征：${traitsText}`
                console.log('添加了特征信息:', traitsText)
              }
            } else {
              console.log('没有有效的特征信息:', c.traits)
            }
            return info
          })
          .join('\n\n')
        if (characterInfo) {
          parts.push(`主要人物：\n${characterInfo}`)
          console.log('添加了人物信息:', characterInfo)
        }
      } else {
        console.log('没有人物信息')
      }

      // 重要地点
      if (settings.locations && settings.locations.length > 0) {
        const locationInfo = settings.locations
          .filter(l => l.name)
          .map(l => `${l.name}：${l.description || ''}`)
          .join('；')
        if (locationInfo) {
          parts.push(`重要地点：${locationInfo}`)
        }
      }

      return parts.join('\n')
    }

    // 初始化
    initSettings()
    
    return {
      uiStore,
      displayText,
      isStreaming,
      rewriteError,
      furtherPrompt,
      getRewriteTypeLabel,
      formatRewriteText,
      replaceText,
      retryRewrite,
      applyFurtherRequest,
      closeRewriteSession,
      // 续写相关
      closeContinueSession,
      appendText,
      retryContinue,
      // AI功能面板
      activeFeatureTab,
      featureTabs,
      autoSummaryEnabled,
      includeFullContextDefault,
      alwaysIncludeWorldBook,
      toggleAutoSummary,
      saveSettings
    }
  }
}
</script>

<style scoped>
.ai-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.ai-icon {
  font-size: 1.3rem;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 重写会话样式 */
.rewrite-session {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.session-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.session-icon {
  font-size: 1.1rem;
}

.close-session-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
}

.close-session-btn:hover {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
}

.section-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 原文显示 */
.original-text-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.original-text {
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
  word-wrap: break-word;
}

/* 重写结果显示 */
.rewrite-result-section {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.streaming-indicator {
  font-size: 0.8rem;
  color: var(--accent-color);
  font-weight: 500;
}

.dots {
  animation: blink 1.4s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.rewrite-result {
  flex: 1;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
  overflow-y: auto;
  position: relative;
  min-height: 120px;
}

.result-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.streaming-cursor {
  color: var(--accent-color);
  font-weight: bold;
  animation: blink-cursor 1s infinite;
}

@keyframes blink-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  border-radius: 6px;
  font-size: 0.85rem;
  margin-top: 8px;
}

.error-icon {
  font-size: 1rem;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  background: var(--nav-hover-bg);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.replace-btn:hover:not(:disabled) {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border-color: transparent;
}

.retry-btn:hover:not(:disabled) {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.btn-icon {
  font-size: 0.9rem;
}

/* 进一步要求 */
.further-request {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.further-prompt-input {
  width: 100%;
  min-height: 60px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.85rem;
  line-height: 1.4;
  resize: vertical;
  margin-bottom: 8px;
  font-family: inherit;
}

.further-prompt-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-shadow);
}

.apply-further-btn {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  border-color: transparent;
  width: 100%;
}

.apply-further-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 默认状态 */
.default-state {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.welcome-section {
  text-align: center;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.welcome-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.welcome-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.welcome-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tips-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.tip-icon {
  font-size: 1rem;
  margin-top: 1px;
  flex-shrink: 0;
}


/* 自定义滚动条 */
.panel-content::-webkit-scrollbar,
.rewrite-result::-webkit-scrollbar,
.original-text::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track,
.rewrite-result::-webkit-scrollbar-track,
.original-text::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb,
.rewrite-result::-webkit-scrollbar-thumb,
.original-text::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.rewrite-result::-webkit-scrollbar-thumb:hover,
.original-text::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.theme-dark .panel-content::-webkit-scrollbar-track,
.theme-dark .rewrite-result::-webkit-scrollbar-track,
.theme-dark .original-text::-webkit-scrollbar-track,
.theme-oled .panel-content::-webkit-scrollbar-track,
.theme-oled .rewrite-result::-webkit-scrollbar-track,
.theme-oled .original-text::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.theme-dark .panel-content::-webkit-scrollbar-thumb,
.theme-dark .rewrite-result::-webkit-scrollbar-thumb,
.theme-dark .original-text::-webkit-scrollbar-thumb,
.theme-oled .panel-content::-webkit-scrollbar-thumb,
.theme-oled .rewrite-result::-webkit-scrollbar-thumb,
.theme-oled .original-text::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.theme-dark .panel-content::-webkit-scrollbar-thumb:hover,
.theme-dark .rewrite-result::-webkit-scrollbar-thumb:hover,
.theme-dark .original-text::-webkit-scrollbar-thumb:hover,
.theme-oled .panel-content::-webkit-scrollbar-thumb:hover,
.theme-oled .rewrite-result::-webkit-scrollbar-thumb:hover,
.theme-oled .original-text::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* AI功能面板样式 */
.ai-features-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.features-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
}

.feature-tab {
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
}

.feature-tab:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.feature-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.feature-content {
  flex: 1;
  overflow: hidden;
}

.feature-section {
  height: 100%;
  overflow-y: auto;
}

.settings-content {
  padding: 20px;
}

.settings-content h4 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-control input[type="checkbox"] {
  margin: 0;
}

.setting-control span {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.tips-content {
  padding: 20px;
}

.tips-content h4 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.tips-content .tips-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tips-content .tip-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.tips-content .tip-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tip-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>