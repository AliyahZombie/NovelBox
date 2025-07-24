/**
 * NovelBox 应用主逻辑
 * 小说创作工具的核心功能实现
 */

class NovelBox {
    constructor() {
        this.novels = [];
        this.currentNovel = null;
        this.currentChapter = null;
        this.autoSaveTimer = null;
        
        this.init();
    }

    async init() {
        await this.loadNovels();
        this.renderNovelsList();
        this.bindEvents();
        this.updateStoragePathDisplay();
        console.log('NovelBox 应用已加载');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        document.getElementById('new-novel-form').addEventListener('submit', (e) => {
            this.handleNewNovelSubmit(e);
        });

        document.getElementById('new-novel-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideNewNovelModal();
            }
        });

        const editor = document.getElementById('chapter-editor');
        if (editor) {
            editor.addEventListener('input', () => {
                this.handleEditorInput();
            });
        }
    }

    /**
     * 渲染小说列表
     */
    renderNovelsList() {
        const novelsList = document.getElementById('novels-list');
        
        if (this.novels.length === 0) {
            novelsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <p>还没有小说，点击上方按钮创建第一部作品吧！</p>
                </div>
            `;
        } else {
            novelsList.innerHTML = this.novels.map(novel => `
                <div class="novel-card">
                    <div class="novel-cover" onclick="app.openNovel('${novel.id}')">
                        ${novel.cover ? `<img src="${novel.cover}" alt="封面">` : '暂无封面'}
                    </div>
                    <div class="novel-info" onclick="app.openNovel('${novel.id}')">
                        <div class="novel-title">${this.escapeHtml(novel.name)}</div>
                        <div class="novel-author">作者：${this.escapeHtml(novel.author)}</div>
                        <div class="novel-description">${this.escapeHtml(novel.description || '暂无简介')}</div>
                    </div>
                    <div class="novel-actions" onclick="event.stopPropagation()">
                        <button class="novel-action-btn" onclick="app.editNovelInfo('${novel.id}')" title="编辑信息">✏️</button>
                        <button class="novel-action-btn delete" onclick="app.deleteNovel('${novel.id}')" title="删除小说">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    /**
     * 显示新建小说模态框
     */
    showNewNovelModal() {
        document.getElementById('new-novel-modal').classList.add('active');
        document.getElementById('novel-name').focus();
    }

    /**
     * 隐藏新建小说模态框
     */
    hideNewNovelModal() {
        document.getElementById('new-novel-modal').classList.remove('active');
        document.getElementById('new-novel-form').reset();
    }

    /**
     * 处理新建小说表单提交
     */
    async handleNewNovelSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('novel-name').value.trim();
        const author = document.getElementById('novel-author').value.trim();
        const description = document.getElementById('novel-description').value.trim();
        
        if (!name || !author) {
            alert('请填写必要信息');
            return;
        }
        
        const novel = {
            id: Date.now().toString(),
            name,
            author,
            description,
            cover: null,
            chapters: [{
                id: Date.now().toString(),
                title: '第一章',
                content: '',
                wordCount: 0
            }],
            createdAt: new Date().toISOString()
        };
        
        this.novels.push(novel);
        await this.saveNovels();
        
        this.hideNewNovelModal();
        this.renderNovelsList();
    }

    /**
     * 打开小说编辑器
     */
    openNovel(novelId) {
        this.currentNovel = this.novels.find(n => n.id === novelId);
        if (!this.currentNovel) return;
        
        document.getElementById('homepage').classList.remove('active');
        document.getElementById('editor-page').classList.add('active');
        
        document.getElementById('current-novel-title').textContent = this.currentNovel.name;
        
        this.renderChaptersList();
        
        if (this.currentNovel.chapters.length > 0) {
            this.openChapter(this.currentNovel.chapters[0].id);
        }
    }

    /**
     * 返回主页
     */
    async goToHomepage() {
        if (this.currentChapter) {
            await this.saveNovels();
        }
        
        document.getElementById('editor-page').classList.remove('active');
        document.getElementById('homepage').classList.add('active');
        
        this.clearAutoSaveTimer();
        this.currentNovel = null;
        this.currentChapter = null;
    }

    /**
     * 渲染章节列表
     */
    renderChaptersList() {
        const chaptersList = document.getElementById('chapters-list');
        chaptersList.innerHTML = this.currentNovel.chapters.map(chapter => `
            <div class="chapter-item ${this.currentChapter && this.currentChapter.id === chapter.id ? 'active' : ''}" 
                 onclick="app.openChapter('${chapter.id}')">
                <div class="chapter-content">
                    <div class="chapter-title">${this.escapeHtml(chapter.title)}</div>
                    <div class="chapter-word-count">${chapter.wordCount || 0} 字</div>
                </div>
                <div class="chapter-actions" onclick="event.stopPropagation()">
                    <button class="chapter-action-btn" onclick="app.editChapterTitle('${chapter.id}')" title="重命名">✏️</button>
                    <button class="chapter-action-btn delete" onclick="app.deleteChapter('${chapter.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 打开章节
     */
    async openChapter(chapterId) {
        if (this.currentChapter) {
            await this.saveNovels();
        }
        
        this.currentChapter = this.currentNovel.chapters.find(c => c.id === chapterId);
        if (!this.currentChapter) return;
        
        document.getElementById('chapter-editor').value = this.currentChapter.content || '';
        this.renderChaptersList();
        
        this.startAutoSave();
    }

    /**
     * 添加新章节
     */
    async addNewChapter() {
        if (!this.currentNovel) return;
        
        const chapterNumber = this.currentNovel.chapters.length + 1;
        const newChapter = {
            id: Date.now().toString(),
            title: `第${chapterNumber}章`,
            content: '',
            wordCount: 0
        };
        
        this.currentNovel.chapters.push(newChapter);
        await this.saveNovels();
        this.renderChaptersList();
        this.openChapter(newChapter.id);
    }

    async deleteChapter(chapterId) {
        if (!this.currentNovel) return;
        
        if (this.currentNovel.chapters.length <= 1) {
            alert('至少需要保留一个章节');
            return;
        }
        
        if (!confirm('确定要删除这个章节吗？此操作不可撤销。')) {
            return;
        }
        
        const chapterIndex = this.currentNovel.chapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;
        
        this.currentNovel.chapters.splice(chapterIndex, 1);
        
        if (this.currentChapter && this.currentChapter.id === chapterId) {
            this.currentChapter = this.currentNovel.chapters[0];
            document.getElementById('chapter-editor').value = this.currentChapter.content || '';
        }
        
        await this.saveNovels();
        this.renderChaptersList();
    }

    async editChapterTitle(chapterId) {
        const chapter = this.currentNovel.chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        
        const newTitle = prompt('请输入新的章节标题:', chapter.title);
        if (newTitle && newTitle.trim() && newTitle.trim() !== chapter.title) {
            chapter.title = newTitle.trim();
            await this.saveNovels();
            this.renderChaptersList();
        }
    }

    async editNovelInfo(novelId) {
        const novel = this.novels.find(n => n.id === novelId);
        if (!novel) return;
        
        const newName = prompt('请输入小说名称:', novel.name);
        if (!newName || !newName.trim()) return;
        
        const newAuthor = prompt('请输入作者:', novel.author);
        if (!newAuthor || !newAuthor.trim()) return;
        
        const newDescription = prompt('请输入简介:', novel.description || '');
        
        novel.name = newName.trim();
        novel.author = newAuthor.trim();
        novel.description = newDescription ? newDescription.trim() : '';
        
        await this.saveNovels();
        this.renderNovelsList();
    }

    async deleteNovel(novelId) {
        if (!confirm('确定要删除这部小说吗？此操作不可撤销。')) {
            return;
        }
        
        const novelIndex = this.novels.findIndex(n => n.id === novelId);
        if (novelIndex === -1) return;
        
        this.novels.splice(novelIndex, 1);
        await this.saveNovels();
        this.renderNovelsList();
    }

    /**
     * 处理编辑器输入
     */
    handleEditorInput() {
        if (!this.currentChapter) return;
        
        const content = document.getElementById('chapter-editor').value;
        this.currentChapter.content = content;
        this.currentChapter.wordCount = content.length;
        
        this.renderChaptersList();
    }

    /**
     * 开始自动保存
     */
    startAutoSave() {
        this.clearAutoSaveTimer();
        this.autoSaveTimer = setInterval(async () => {
            if (this.currentChapter) {
                await this.saveNovels();
                this.showSaveIndicator();
            }
        }, 5000);
    }

    /**
     * 清除自动保存定时器
     */
    clearAutoSaveTimer() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * 从文件加载小说数据
     */
    async loadNovels() {
        try {
            const result = await window.electronAPI.storage.loadNovels();
            if (result.success) {
                this.novels = result.data || [];
            } else {
                console.error('加载小说数据失败:', result.error);
                this.novels = [];
            }
        } catch (error) {
            console.error('加载小说数据异常:', error);
            this.novels = [];
        }
    }

    /**
     * 保存小说数据到文件
     */
    async saveNovels() {
        try {
            const result = await window.electronAPI.storage.saveNovels(this.novels);
            if (!result.success) {
                console.error('保存小说数据失败:', result.error);
                alert('保存失败: ' + result.error);
            }
        } catch (error) {
            console.error('保存小说数据异常:', error);
            alert('保存异常: ' + error.message);
        }
    }

    /**
     * 更新存储路径显示
     */
    async updateStoragePathDisplay() {
        try {
            const currentPath = await window.electronAPI.storage.getCurrentPath();
            const pathElement = document.getElementById('storage-path');
            if (pathElement) {
                pathElement.textContent = currentPath;
            }
        } catch (error) {
            console.error('获取存储路径失败:', error);
        }
    }

    /**
     * 选择存储目录
     */
    async selectStorageDirectory() {
        try {
            const selectedPath = await window.electronAPI.storage.selectDirectory();
            if (selectedPath) {
                await this.updateStoragePathDisplay();
                alert('存储目录已更改为: ' + selectedPath);
            }
        } catch (error) {
            console.error('选择存储目录失败:', error);
            alert('选择目录失败: ' + error.message);
        }
    }

    /**
     * 重置为默认存储目录
     */
    async resetStorageDirectory() {
        try {
            const defaultPath = await window.electronAPI.storage.resetToDefault();
            await this.updateStoragePathDisplay();
            alert('已重置为默认存储目录: ' + defaultPath);
        } catch (error) {
            console.error('重置存储目录失败:', error);
            alert('重置失败: ' + error.message);
        }
    }

    async manualSave() {
        if (!this.currentNovel) return;
        
        try {
            await this.saveNovels();
            this.showSaveIndicator('手动保存成功');
        } catch (error) {
            console.error('手动保存失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    showSaveIndicator(message = '已自动保存') {
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.style.display = 'inline';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 2000);
        }
    }

    /**
     * 切换左侧边栏
     */
    toggleLeftSidebar() {
        const sidebar = document.getElementById('left-sidebar');
        const toggle = document.getElementById('left-sidebar-toggle');
        
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            toggle.style.display = 'flex';
        } else {
            toggle.style.display = 'none';
        }
    }

    /**
     * 切换右侧边栏
     */
    toggleRightSidebar() {
        const sidebar = document.getElementById('right-sidebar');
        const toggle = document.getElementById('right-sidebar-toggle');
        
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            toggle.style.display = 'flex';
        } else {
            toggle.style.display = 'none';
        }
    }

    /**
     * HTML转义，防止XSS攻击
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// 全局应用实例
let app;

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async function() {
    app = new NovelBox();
});

// 全局函数，供HTML调用
function showNewNovelModal() {
    app.showNewNovelModal();
}

function hideNewNovelModal() {
    app.hideNewNovelModal();
}

function goToHomepage() {
    app.goToHomepage();
}

function addNewChapter() {
    app.addNewChapter();
}

function toggleLeftSidebar() {
    app.toggleLeftSidebar();
}

function toggleRightSidebar() {
    app.toggleRightSidebar();
}

function selectStorageDirectory() {
    app.selectStorageDirectory();
}

function resetStorageDirectory() {
    app.resetStorageDirectory();
}

function manualSave() {
    app.manualSave();
}