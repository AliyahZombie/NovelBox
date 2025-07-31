<template>
  <div class="world-book-editor">
    <div class="editor-header">
      <h3 class="editor-title">
        <span class="title-icon">🌍</span>
        {{ $t('worldBook.title') }}
      </h3>
      <div class="header-actions">
        <button 
          class="save-btn"
          @click="saveWorldBook"
          :disabled="saving"
        >
          <span v-if="saving">{{ $t('common.saving') }}</span>
          <span v-else>{{ $t('common.save') }}</span>
        </button>
      </div>
    </div>

    <div class="editor-content">
      <div class="header-row">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <div class="header-actions">
          <button
            class="save-btn"
            @click="saveWorldBook"
            :disabled="saving"
          >
            <span class="btn-icon">💾</span>
            {{ saving ? $t('common.saving') : $t('common.save') }}
          </button>
        </div>
      </div>

      <div class="tab-content">
        <!-- 世界设定 -->
        <div v-if="activeTab === 'world'" class="world-settings">
          <div class="form-group">
            <label>{{ $t('worldBook.worldName') }}</label>
            <input 
              v-model="worldBook.settings.world.name"
              type="text"
              :placeholder="$t('worldBook.worldNamePlaceholder')"
            />
          </div>
          
          <div class="form-group">
            <label>{{ $t('worldBook.worldDescription') }}</label>
            <textarea 
              v-model="worldBook.settings.world.description"
              :placeholder="$t('worldBook.worldDescriptionPlaceholder')"
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>{{ $t('worldBook.worldRules') }}</label>
            <div class="rules-list">
              <div 
                v-for="(rule, index) in worldBook.settings.world.rules" 
                :key="index"
                class="rule-item"
              >
                <input 
                  v-model="worldBook.settings.world.rules[index]"
                  type="text"
                  :placeholder="$t('worldBook.rulePlaceholder')"
                />
                <button @click="removeRule(index)" class="remove-btn">×</button>
              </div>
              <button @click="addRule" class="add-btn">
                + {{ $t('worldBook.addRule') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 人物设定 -->
        <div v-if="activeTab === 'characters'" class="characters-settings">
          <div class="items-header">
            <h4>{{ $t('worldBook.characters') }}</h4>
            <button @click="addCharacter" class="add-btn">
              + {{ $t('worldBook.addCharacter') }}
            </button>
          </div>
          
          <div class="items-list">
            <!-- 空状态提示 -->
            <div v-if="worldBook.settings.characters.length === 0" class="empty-state">
              <div class="empty-icon">👥</div>
              <p class="empty-text">{{ $t('worldBook.noCharactersYet') }}</p>
              <button @click="addCharacter" class="add-btn primary">
                + {{ $t('worldBook.addFirstCharacter') }}
              </button>
            </div>
            
            <div 
              v-for="(character, index) in worldBook.settings.characters" 
              :key="character.id"
              class="item-card"
            >
              <div class="item-header">
                <input 
                  v-model="character.name"
                  type="text"
                  :placeholder="$t('worldBook.characterName')"
                  class="item-name"
                />
                <button @click="removeCharacter(index)" class="remove-btn">×</button>
              </div>
              
              <div class="item-content">
                <div class="form-group">
                  <label>{{ $t('worldBook.description') }}</label>
                  <textarea
                    v-model="character.description"
                    :placeholder="$t('worldBook.characterDescriptionPlaceholder')"
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label>{{ $t('worldBook.example') }}</label>
                  <textarea
                    v-model="character.example"
                    :placeholder="$t('worldBook.examplePlaceholder')"
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-group">
                  <label>{{ $t('worldBook.traits') }}</label>
                  <div class="tags-input">
                    <span
                      v-for="(trait, traitIndex) in character.traits"
                      :key="traitIndex"
                      class="tag"
                    >
                      {{ trait }}
                      <button @click="removeTrait(index, traitIndex)" class="tag-remove">×</button>
                    </span>
                    <input
                      v-model="newTrait[character.id]"
                      type="text"
                      :placeholder="$t('worldBook.addTrait')"
                      @keyup.enter="addTrait(index, character.id)"
                      class="tag-input"
                    />
                  </div>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useNovelsStore } from '@/stores/novels'
import { useUIStore } from '@/stores/ui'
import { ElectronStorageService } from '@/services/electron'
import { useI18n } from 'vue-i18n'

export default {
  name: 'WorldBookEditor',
  setup() {
    const { t } = useI18n()
    const novelsStore = useNovelsStore()
    const uiStore = useUIStore()
    
    const activeTab = ref('world')
    const saving = ref(false)
    const newTrait = reactive({})
    
    const worldBook = reactive({
      settings: {
        world: {
          name: '',
          description: '',
          rules: []
        },
        characters: [],
        locations: [],
        items: [],
        timeline: []
      }
    })

    const tabs = computed(() => [
      { key: 'world', label: t('worldBook.world'), icon: '🌍' },
      { key: 'characters', label: t('worldBook.characters'), icon: '👥' }
    ])

    // 加载世界书数据
    const loadWorldBook = async () => {
      if (!novelsStore.currentNovel) return

      try {
        const result = await ElectronStorageService.loadWorldBook(novelsStore.currentNovel.id)
        console.log('加载世界书结果:', result)

        if (result.success && result.data) {
          // 深度合并数据，确保嵌套对象正确更新
          if (result.data.settings) {
            if (result.data.settings.world) {
              Object.assign(worldBook.settings.world, result.data.settings.world)
            }
            if (result.data.settings.characters) {
              worldBook.settings.characters.splice(0, worldBook.settings.characters.length, ...result.data.settings.characters)
            }
            if (result.data.settings.locations) {
              worldBook.settings.locations.splice(0, worldBook.settings.locations.length, ...result.data.settings.locations)
            }
            if (result.data.settings.items) {
              worldBook.settings.items.splice(0, worldBook.settings.items.length, ...result.data.settings.items)
            }
            if (result.data.settings.timeline) {
              worldBook.settings.timeline.splice(0, worldBook.settings.timeline.length, ...result.data.settings.timeline)
            }
          }
        }
      } catch (error) {
        console.error('加载世界书失败:', error)
        const errorMessage = error.message || t('worldBook.loadError')
        const details = `世界书信息:\n小说ID: ${novelsStore.currentNovel?.id}\n小说标题: ${novelsStore.currentNovel?.title}\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `加载世界书失败: ${errorMessage}`,
          details
        )
      }
    }

    // 保存世界书数据
    const saveWorldBook = async () => {
      if (!novelsStore.currentNovel || saving.value) return

      saving.value = true
      try {
        console.log('保存世界书:', {
          novelId: novelsStore.currentNovel.id,
          worldBookData: worldBook
        })

        // 将响应式对象转换为普通对象，避免克隆错误
        const plainWorldBook = JSON.parse(JSON.stringify(worldBook))
        
        const result = await ElectronStorageService.saveWorldBook(
          novelsStore.currentNovel.id,
          plainWorldBook
        )

        console.log('保存结果:', result)
        
        if (result.success) {
          uiStore.showSaveMessage(t('worldBook.saveSuccess'))
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('保存世界书失败:', error)
        const errorMessage = error.message || t('worldBook.saveError')
        const details = `保存信息:\n小说ID: ${novelsStore.currentNovel?.id}\n小说标题: ${novelsStore.currentNovel?.title}\n世界书大小: ${JSON.stringify(worldBook).length} 字符\n错误详情: ${error.stack || error.message || '未知错误'}`

        uiStore.showError(
          `保存世界书失败: ${errorMessage}`,
          details
        )
      } finally {
        saving.value = false
      }
    }

    // 规则管理
    const addRule = () => {
      worldBook.settings.world.rules.push('')
    }

    const removeRule = (index) => {
      worldBook.settings.world.rules.splice(index, 1)
    }

    // 人物管理
    const addCharacter = () => {
      const character = {
        id: Date.now().toString(),
        name: '',
        description: '',
        example: '',
        traits: [],
        relationships: []
      }
      worldBook.settings.characters.push(character)
      newTrait[character.id] = ''
    }

    const removeCharacter = (index) => {
      const character = worldBook.settings.characters[index]
      delete newTrait[character.id]
      worldBook.settings.characters.splice(index, 1)
    }

    const addTrait = (characterIndex, characterId) => {
      const trait = newTrait[characterId]?.trim()
      if (trait) {
        worldBook.settings.characters[characterIndex].traits.push(trait)
        newTrait[characterId] = ''
      }
    }

    const removeTrait = (characterIndex, traitIndex) => {
      worldBook.settings.characters[characterIndex].traits.splice(traitIndex, 1)
    }



    // 监听当前小说变化
    watch(() => novelsStore.currentNovel, loadWorldBook, { immediate: true })

    onMounted(() => {
      loadWorldBook()
    })

    return {
      activeTab,
      saving,
      newTrait,
      worldBook,
      tabs,
      saveWorldBook,
      addRule,
      removeRule,
      addCharacter,
      removeCharacter,
      addTrait,
      removeTrait
    }
  }
}
</script>

<style scoped>
.world-book-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.title-icon {
  font-size: 1.3rem;
}

.save-btn {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #0056b3;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  padding-right: 16px;
}

.tabs {
  display: flex;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 0.9rem;
}

.tab-btn {
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
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--nav-hover-bg);
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rule-item input {
  flex: 1;
}

.remove-btn {
  padding: 4px 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.add-btn {
  padding: 8px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  align-self: flex-start;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.items-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg);
}

.item-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  min-height: 40px;
}

.tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #007bff;
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  color: var(--text-primary);
  min-width: 100px;
}

.timeline-event {
  position: relative;
}

.timeline-event::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 20px;
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.add-btn.primary {
  background: #007bff;
  color: white;
  font-weight: 500;
  padding: 10px 20px;
}

.add-btn.primary:hover {
  background: #0056b3;
}
</style>
