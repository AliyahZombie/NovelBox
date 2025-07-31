/**
 * Toast 通知服务
 * 提供全局的消息提示功能
 */

import { createApp } from 'vue'
import Toast from '@/components/ui/Toast.vue'

class ToastService {
  constructor() {
    this.toasts = []
    this.container = null
  }

  /**
   * 确保容器存在
   */
  ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `
      document.body.appendChild(this.container)
    }
  }

  /**
   * 显示Toast
   */
  show(options) {
    this.ensureContainer()

    const {
      message,
      title = '',
      details = '',
      type = 'info',
      duration = 5000,
      autoClose = true
    } = options

    // 创建Toast组件实例
    const toastElement = document.createElement('div')
    this.container.appendChild(toastElement)

    const app = createApp(Toast, {
      message,
      title,
      details,
      type,
      duration,
      autoClose,
      onClose: () => {
        // 清理组件
        app.unmount()
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement)
        }
        
        // 从列表中移除
        const index = this.toasts.findIndex(t => t.element === toastElement)
        if (index > -1) {
          this.toasts.splice(index, 1)
        }

        // 如果没有Toast了，清理容器
        if (this.toasts.length === 0 && this.container) {
          document.body.removeChild(this.container)
          this.container = null
        }
      }
    })

    app.mount(toastElement)

    // 添加到列表
    this.toasts.push({
      element: toastElement,
      app
    })

    return {
      close: () => {
        app.unmount()
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement)
        }
      }
    }
  }

  /**
   * 显示成功消息
   */
  success(message, title = '', details = '') {
    return this.show({
      message,
      title: title || '成功',
      details,
      type: 'success'
    })
  }

  /**
   * 显示错误消息
   */
  error(message, title = '', details = '') {
    return this.show({
      message,
      title: title || '错误',
      details,
      type: 'error',
      duration: 10000 // 错误消息显示更长时间
    })
  }

  /**
   * 显示警告消息
   */
  warning(message, title = '', details = '') {
    return this.show({
      message,
      title: title || '警告',
      details,
      type: 'warning'
    })
  }

  /**
   * 显示信息消息
   */
  info(message, title = '', details = '') {
    return this.show({
      message,
      title: title || '提示',
      details,
      type: 'info'
    })
  }

  /**
   * 清除所有Toast
   */
  clear() {
    this.toasts.forEach(toast => {
      toast.app.unmount()
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element)
      }
    })
    this.toasts = []

    if (this.container) {
      document.body.removeChild(this.container)
      this.container = null
    }
  }
}

// 创建全局实例
export const toast = new ToastService()

// 默认导出
export default toast
