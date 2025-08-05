/**
 * @type {import('electron-builder').Configuration}
 */
const config = {
  appId: 'com.novelbox.app',
  productName: 'NovelBox',
  directories: {
    output: 'dist'
  },
  files: [
    'dist/**/*',
    'main.js',
    'preload.js',
    'package.json',
    '!node_modules/**/*'
  ],
  extends: null,
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'zip',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: true
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    category: 'public.app-category.utilities'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    category: 'Utility',
    maintainer: 'NovelBox Team <novelbox@example.com>'
  },
  // 添加publish配置，避免CI环境中要求GH_TOKEN
  publish: {
    provider: 'github',
    releaseType: 'draft'
  }
}

module.exports = config