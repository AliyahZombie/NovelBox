/**
 * LLM统一服务接口
 * 支持多个LLM提供商（OpenAI、Gemini等）的统一调用
 */

// System Prompt
const SystemPrompt = localStorage.getItem(('novelbox-system-prompt'));

/**
 * LLM请求参数接口
 */
export class LLMRequest {
  constructor({
    prompt,
    maxTokens = 1000,
    temperature = 0.7,
    topP = 0.95,
    topK = 40,
    stopSequences = [],
    stream = false
  } = {}) {
    this.prompt = prompt
    this.maxTokens = maxTokens
    this.temperature = temperature
    this.topP = topP
    this.topK = topK
    this.stopSequences = stopSequences
    this.stream = stream
  }
}

/**
 * LLM响应接口
 */
export class LLMResponse {
  constructor({
    content = '',
    tokensUsed = 0,
    finishReason = '',
    error = null,
    delta = '',
    isStream = false
  } = {}) {
    this.content = content
    this.tokensUsed = tokensUsed
    this.finishReason = finishReason
    this.error = error
    this.success = !error
    this.delta = delta
    this.isStream = isStream
  }
}

/**
 * LLM提供商基类
 */
export class LLMProvider {
  constructor(config) {
    this.config = config
    this.type = config.type
    this.name = config.name
    this.baseUrl = config.base_url
    this.apiKey = config.api_key
    this.models = config.models || []
  }

  /**
   * 生成内容 - 子类需要实现
   * @param {string} modelName - 模型名称
   * @param {LLMRequest} request - 请求参数
   * @returns {Promise<LLMResponse>} 响应结果
   */
  async generateContent(modelName, request) {
    throw new Error('generateContent method must be implemented by subclass')
  }

  /**
   * 生成流式内容 - 子类需要实现
   * @param {string} modelName - 模型名称
   * @param {LLMRequest} request - 请求参数
   * @param {function} onChunk - 接收流式数据的回调函数
   * @returns {Promise<LLMResponse>} 最终响应结果
   */
  async generateStreamContent(modelName, request, onChunk) {
    throw new Error('generateStreamContent method must be implemented by subclass')
  }

  /**
   * 验证配置
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error(`${this.type} provider requires API key`)
    }
    if (!this.baseUrl) {
      throw new Error(`${this.type} provider requires base URL`)
    }
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels() {
    return this.models
  }
}

/**
 * OpenAI提供商实现
 */
export class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config)
    this.validateConfig()
  }

  async generateContent(modelName, request) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }

      const body = {
        model: modelName,
        messages: [
          { role: 'system', content: SystemPrompt },
          { role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop: request.stopSequences.length > 0 ? request.stopSequences : undefined
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      if (!choice) {
        throw new Error('No response choice available')
      }

      return new LLMResponse({
        content: choice.message?.content || '',
        tokensUsed: data.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'unknown'
      })

    } catch (error) {
      return new LLMResponse({
        error: error.message
      })
    }
  }

  async generateStreamContent(modelName, request, onChunk) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }

      const body = {
        model: modelName,
        messages: [ { role: 'system', content: SystemPrompt },
          { role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop: request.stopSequences.length > 0 ? request.stopSequences : undefined,
        stream: true
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let totalTokens = 0
      let finishReason = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                return new LLMResponse({
                  content: fullContent,
                  tokensUsed: totalTokens,
                  finishReason: finishReason || 'stop'
                })
              }

              try {
                const parsed = JSON.parse(data)
                const choice = parsed.choices?.[0]
                if (choice) {
                  const delta = choice.delta?.content || ''
                  if (delta) {
                    fullContent += delta
                    if (onChunk) {
                      onChunk(new LLMResponse({
                        delta,
                        content: fullContent,
                        isStream: true
                      }))
                    }
                  }
                  if (choice.finish_reason) {
                    finishReason = choice.finish_reason
                  }
                }
                if (parsed.usage?.total_tokens) {
                  totalTokens = parsed.usage.total_tokens
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return new LLMResponse({
        content: fullContent,
        tokensUsed: totalTokens,
        finishReason: finishReason || 'stop'
      })

    } catch (error) {
      return new LLMResponse({
        error: error.message
      })
    }
  }
}

/**
 * Gemini提供商实现
 */
export class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config)
    this.validateConfig()
  }

  async generateContent(modelName, request) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      }

      // Gemini API的安全设置
      const safetySettings = [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'OFF'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'OFF'
        },
        ,
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'OFF'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'OFF'
        }
        
      ]

      const body = {
        contents: [{
          parts: [{ text: request.prompt }]
        }],
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          topP: request.topP,
          topK: request.topK,
          stopSequences: request.stopSequences.length > 0 ? request.stopSequences : undefined
        },
        systemInstruction: [
          {
            text: SystemPrompt
          }
        ],

        safetySettings
      }

      const url = `${this.baseUrl}/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      const candidate = data.candidates?.[0]

      if (!candidate) {
        throw new Error('No response candidate available')
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Response was blocked by safety filters')
      }

      const content = candidate.content?.parts?.[0]?.text || ''

      return new LLMResponse({
        content,
        tokensUsed: data.usageMetadata?.totalTokenCount || 0,
        finishReason: candidate.finishReason || 'unknown'
      })

    } catch (error) {
      return new LLMResponse({
        error: error.message
      })
    }
  }

  async generateStreamContent(modelName, request, onChunk) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      }

     const safetySettings = [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'OFF'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'OFF'
        },
        ,
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'OFF'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'OFF'
        }
        
      ]

      const body = {
        contents: [{
          parts: [{ text: request.prompt }]
        }],
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          topP: request.topP,
          topK: request.topK,
          stopSequences: request.stopSequences.length > 0 ? request.stopSequences : undefined
        },
        systemInstruction: [
          {
            text: SystemPrompt
          }
        ],
        safetySettings
      }

      const url = `${this.baseUrl}/v1beta/models/${modelName}:streamGenerateContent?key=${this.apiKey}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let totalTokens = 0
      let finishReason = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              
              try {
                const parsed = JSON.parse(data)
                const candidate = parsed.candidates?.[0]
                
                if (candidate) {
                  if (candidate.finishReason === 'SAFETY') {
                    throw new Error('Response was blocked by safety filters')
                  }

                  const delta = candidate.content?.parts?.[0]?.text || ''
                  if (delta) {
                    fullContent += delta
                    if (onChunk) {
                      onChunk(new LLMResponse({
                        delta,
                        content: fullContent,
                        isStream: true
                      }))
                    }
                  }
                  
                  if (candidate.finishReason) {
                    finishReason = candidate.finishReason
                  }
                }
                
                if (parsed.usageMetadata?.totalTokenCount) {
                  totalTokens = parsed.usageMetadata.totalTokenCount
                }
              } catch (parseError) {
                console.warn('Failed to parse Gemini stream data:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return new LLMResponse({
        content: fullContent,
        tokensUsed: totalTokens,
        finishReason: finishReason || 'stop'
      })

    } catch (error) {
      return new LLMResponse({
        error: error.message
      })
    }
  }
}

/**
 * LLM服务管理器
 */
export class LLMService {
  constructor() {
    this.providers = new Map()
    this.loadProviders()
  }

  /**
   * 从本地存储加载提供商配置
   */
  loadProviders() {
    try {
      const providersData = localStorage.getItem('novelbox-providers')
      if (!providersData) return

      const providers = JSON.parse(providersData)
      
      providers.forEach(config => {
        const providerKey = `${config.name}_${config.type}`
        
        if (config.type === 'OpenAI') {
          this.providers.set(providerKey, new OpenAIProvider(config))
        } else if (config.type === 'Gemini') {
          this.providers.set(providerKey, new GeminiProvider(config))
        }
      })
    } catch (error) {
      console.error('Failed to load LLM providers:', error)
    }
  }

  /**
   * 重新加载提供商配置
   */
  reloadProviders() {
    this.providers.clear()
    this.loadProviders()
  }

  /**
   * 生成内容
   * @param {string} providerName - 提供商名称
   * @param {string} modelName - 模型名称
   * @param {LLMRequest|string} request - 请求参数或提示文本
   * @returns {Promise<LLMResponse>} 响应结果
   */
  async generateContent(providerName, modelName, request) {
    try {
      console.log('=== LLMService generateContent 调试信息 ===')
      console.log('Provider:', providerName)
      console.log('Model:', modelName)
      console.log('Request type:', typeof request)

      // 查找匹配的提供商
      const provider = this.findProvider(providerName)
      if (!provider) {
        console.error('Provider not found:', providerName)
        return new LLMResponse({
          error: `Provider not found: ${providerName}`
        })
      }

      // 确保request是LLMRequest对象
      const llmRequest = request instanceof LLMRequest
        ? request
        : new LLMRequest({ prompt: request })

      console.log('=== 最终提示词 ===')
      console.log('Prompt length:', llmRequest.prompt?.length || 0)
      console.log('Prompt preview (前500字符):', llmRequest.prompt?.substring(0, 500) || 'No prompt')
      console.log('Full prompt:', llmRequest.prompt)
      console.log('Temperature:', llmRequest.temperature)
      console.log('MaxTokens:', llmRequest.maxTokens)
      console.log('Stream:', llmRequest.stream)

      // 验证模型是否存在
      const availableModels = provider.getAvailableModels()
      const modelExists = availableModels.some(model => {
        // OpenAI模型格式: {id: "gpt-4", ...}
        // Gemini模型格式: {name: "models/gemini-pro", displayName: "Gemini Pro", ...}
        return model.id === modelName || 
               model.name === modelName || 
               model.name === `models/${modelName}` ||
               model.displayName === modelName
      })

      if (!modelExists) {
        return new LLMResponse({
          error: `Model not found: ${modelName} in provider: ${providerName}`
        })
      }

      const result = await provider.generateContent(modelName, llmRequest)

      console.log('=== LLM响应结果 ===')
      console.log('Success:', result.success)
      console.log('Content length:', result.content?.length || 0)
      console.log('Content preview (前200字符):', result.content?.substring(0, 200) || 'No content')
      console.log('Error:', result.error)

      return result

    } catch (error) {
      console.error('LLMService generateContent error:', error)
      return new LLMResponse({
        error: error.message
      })
    }
  }

  /**
   * 生成流式内容
   * @param {string} providerName - 提供商名称
   * @param {string} modelName - 模型名称
   * @param {LLMRequest|string} request - 请求参数或提示文本
   * @param {function} onChunk - 接收流式数据的回调函数
   * @returns {Promise<LLMResponse>} 最终响应结果
   */
  async generateStreamContent(providerName, modelName, request, onChunk) {
    try {
      // 查找匹配的提供商
      const provider = this.findProvider(providerName)
      if (!provider) {
        return new LLMResponse({
          error: `Provider not found: ${providerName}`
        })
      }

      // 确保request是LLMRequest对象
      const llmRequest = request instanceof LLMRequest 
        ? request 
        : new LLMRequest({ prompt: request, stream: true })

      // 强制启用流式模式
      llmRequest.stream = true

      // 验证模型是否存在
      const availableModels = provider.getAvailableModels()
      const modelExists = availableModels.some(model => {
        return model.id === modelName || 
               model.name === modelName || 
               model.name === `models/${modelName}` ||
               model.displayName === modelName
      })

      if (!modelExists) {
        return new LLMResponse({
          error: `Model not found: ${modelName} in provider: ${providerName}`
        })
      }

      return await provider.generateStreamContent(modelName, llmRequest, onChunk)

    } catch (error) {
      return new LLMResponse({
        error: error.message
      })
    }
  }

  /**
   * 查找提供商
   * @param {string} providerName - 提供商名称
   * @returns {LLMProvider|null} 提供商实例
   */
  findProvider(providerName) {
    // 尝试直接匹配
    for (const [key, provider] of this.providers) {
      if (key.startsWith(providerName)) {
        return provider
      }
    }

    // 尝试按名称匹配
    for (const [key, provider] of this.providers) {
      if (provider.name === providerName) {
        return provider
      }
    }

    return null
  }

  /**
   * 获取所有可用的提供商
   */
  getAvailableProviders() {
    const providers = []
    this.providers.forEach((provider, key) => {
      providers.push({
        key,
        name: provider.name,
        type: provider.type,
        models: provider.getAvailableModels()
      })
    })
    return providers
  }

  /**
   * 获取指定提供商的模型列表
   */
  getProviderModels(providerName) {
    const provider = this.findProvider(providerName)
    return provider ? provider.getAvailableModels() : []
  }
}

// 导出单例实例
export const llmService = new LLMService()