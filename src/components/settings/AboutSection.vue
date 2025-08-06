<template>
  <div class="settings-section">
    <h2 class="section-title">{{ $t('about.title') }}</h2>
    
    <div class="about-content">
      <div class="app-info-card">
        <div class="app-header">
          <div class="app-icon">📚</div>
          <div class="app-meta">
            <h1 class="app-name">{{ $t('about.appName') }}</h1>
            <p class="app-version">{{ $t('about.version', { version: '1.0.0' }) }}</p>
          </div>
        </div>
        <p class="app-description">{{ $t('about.appDescription') }}</p>
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-header">
            <span class="info-icon">🔗</span>
            <h3 class="info-title">{{ $t('about.github') }}</h3>
          </div>
          <a href="https://github.com/AliyahZombie/NovelBox" target="_blank" class="info-link">
            github.com/AliyahZombie/NovelBox
          </a>
        </div>
        
        <div class="info-card">
          <div class="info-header">
            <span class="info-icon">✉️</span>
            <h3 class="info-title">{{ $t('about.contact') }}</h3>
          </div>
          <a href="mailto:aliyahzombie2024@gmail.com" class="info-link">
            aliyahzombie2024@gmail.com
          </a>
        </div>
        
        <div class="info-card">
          <div class="info-header">
            <span class="info-icon">📋</span>
            <h3 class="info-title">{{ $t('about.license') }}</h3>
          </div>
          <span class="info-text">AGPL-3.0</span>
        </div>

        
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutSection'
}
</script>

<style scoped>
.about-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.app-info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.app-icon {
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: var(--accent-color);
  border-radius: 12px;
  filter: grayscale(0);
}

.app-meta {
  flex: 1;
}

.app-name {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--accent-color);
}

.app-version {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0.8;
}

.app-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.info-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
}

.info-card:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--card-shadow);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.info-icon {
  font-size: 1.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-color);
  border-radius: 6px;
  filter: grayscale(0);
}

.info-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.info-link {
  color: var(--accent-color);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  word-break: break-all;
  transition: all 0.2s ease;
}

.info-link:hover {
  text-decoration: underline;
  opacity: 0.8;
}

.info-text {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .app-name {
    font-size: 1.5rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>