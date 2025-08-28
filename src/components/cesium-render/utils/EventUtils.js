/**
 * 事件工具类 - 提供事件管理、发布订阅、事件队列等功能
 */

class EventUtils {
  // 全局事件管理器
  static globalEventManager = null

  /**
   * 获取全局事件管理器
   * @returns {EventManager} 全局事件管理器
   */
  static getGlobalEventManager() {
    if (!this.globalEventManager) {
      this.globalEventManager = new EventManager()
    }
    return this.globalEventManager
  }

  /**
   * 创建事件管理器
   * @param {Object} options - 配置选项
   * @returns {EventManager} 事件管理器实例
   */
  static createEventManager(options = {}) {
    return new EventManager(options)
  }

  /**
   * 创建事件发射器
   * @param {Object} options - 配置选项
   * @returns {EventEmitter} 事件发射器实例
   */
  static createEventEmitter(options = {}) {
    return new EventEmitter(options)
  }

  /**
   * 创建事件队列
   * @param {Object} options - 配置选项
   * @returns {EventQueue} 事件队列实例
   */
  static createEventQueue(options = {}) {
    return new EventQueue(options)
  }

  /**
   * 创建事件总线
   * @param {Object} options - 配置选项
   * @returns {EventBus} 事件总线实例
   */
  static createEventBus(options = {}) {
    return new EventBus(options)
  }

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @param {boolean} immediate - 是否立即执行
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait, immediate = false) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        timeout = null
        if (!immediate) func.apply(this, args)
      }
      const callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func.apply(this, args)
    }
  }

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 限制时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  static throttle(func, limit) {
    let inThrottle
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

/**
 * 事件管理器类
 */
class EventManager {
  constructor(options = {}) {
    this.options = {
      maxListeners: 100,
      enableLogging: false,
      enableMetrics: false,
      ...options,
    }

    this.listeners = new Map()
    this.onceListeners = new Map()
    this.metrics = {
      eventsEmitted: 0,
      listenersAdded: 0,
      listenersRemoved: 0,
    }
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 选项
   */
  on(event, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new Error('监听器必须是函数')
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    const listeners = this.listeners.get(event)

    // 检查最大监听器数量
    if (listeners.length >= this.options.maxListeners) {
      console.warn(`事件 "${event}" 的监听器数量已达到最大值 ${this.options.maxListeners}`)
    }

    const listenerInfo = {
      listener,
      options,
      id: this.generateListenerId(),
      addedAt: Date.now(),
    }

    listeners.push(listenerInfo)

    if (this.options.enableMetrics) {
      this.metrics.listenersAdded++
    }

    if (this.options.enableLogging) {
      console.log(`添加事件监听器: ${event}`, listenerInfo)
    }

    return listenerInfo.id
  }

  /**
   * 添加一次性事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 选项
   */
  once(event, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new Error('监听器必须是函数')
    }

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, [])
    }

    const listeners = this.onceListeners.get(event)

    const listenerInfo = {
      listener,
      options,
      id: this.generateListenerId(),
      addedAt: Date.now(),
    }

    listeners.push(listenerInfo)

    if (this.options.enableMetrics) {
      this.metrics.listenersAdded++
    }

    if (this.options.enableLogging) {
      console.log(`添加一次性事件监听器: ${event}`, listenerInfo)
    }

    return listenerInfo.id
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function|string} listener - 监听器函数或ID
   */
  off(event, listener) {
    let removed = false

    // 从普通监听器中移除
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event)
      const index = listeners.findIndex(
        (item) => item.listener === listener || item.id === listener,
      )

      if (index > -1) {
        listeners.splice(index, 1)
        removed = true

        if (listeners.length === 0) {
          this.listeners.delete(event)
        }
      }
    }

    // 从一次性监听器中移除
    if (this.onceListeners.has(event)) {
      const listeners = this.onceListeners.get(event)
      const index = listeners.findIndex(
        (item) => item.listener === listener || item.id === listener,
      )

      if (index > -1) {
        listeners.splice(index, 1)
        removed = true

        if (listeners.length === 0) {
          this.onceListeners.delete(event)
        }
      }
    }

    if (removed) {
      if (this.options.enableMetrics) {
        this.metrics.listenersRemoved++
      }

      if (this.options.enableLogging) {
        console.log(`移除事件监听器: ${event}`)
      }
    }

    return removed
  }

  /**
   * 移除所有事件监听器
   * @param {string} event - 事件名称（可选）
   */
  removeAllListeners(event) {
    if (event) {
      // 移除指定事件的所有监听器
      const normalCount = this.listeners.has(event) ? this.listeners.get(event).length : 0
      const onceCount = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0

      this.listeners.delete(event)
      this.onceListeners.delete(event)

      if (this.options.enableMetrics) {
        this.metrics.listenersRemoved += normalCount + onceCount
      }
    } else {
      // 移除所有事件的所有监听器
      let totalCount = 0

      this.listeners.forEach((listeners) => {
        totalCount += listeners.length
      })

      this.onceListeners.forEach((listeners) => {
        totalCount += listeners.length
      })

      this.listeners.clear()
      this.onceListeners.clear()

      if (this.options.enableMetrics) {
        this.metrics.listenersRemoved += totalCount
      }
    }
  }

  /**
   * 发射事件
   * @param {string} event - 事件名称
   * @param {...*} args - 事件参数
   */
  emit(event, ...args) {
    let listenerCount = 0

    // 执行普通监听器
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event).slice() // 复制数组避免在执行过程中被修改

      listeners.forEach((listenerInfo) => {
        try {
          listenerInfo.listener.apply(null, args)
          listenerCount++
        } catch (error) {
          console.error(`事件监听器执行出错 (${event}):`, error)
        }
      })
    }

    // 执行一次性监听器
    if (this.onceListeners.has(event)) {
      const listeners = this.onceListeners.get(event).slice()
      this.onceListeners.delete(event) // 清空一次性监听器

      listeners.forEach((listenerInfo) => {
        try {
          listenerInfo.listener.apply(null, args)
          listenerCount++
        } catch (error) {
          console.error(`一次性事件监听器执行出错 (${event}):`, error)
        }
      })

      if (this.options.enableMetrics) {
        this.metrics.listenersRemoved += listeners.length
      }
    }

    if (this.options.enableMetrics) {
      this.metrics.eventsEmitted++
    }

    if (this.options.enableLogging) {
      console.log(`发射事件: ${event}`, { args, listenerCount })
    }

    return listenerCount > 0
  }

  /**
   * 获取事件监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    const normalCount = this.listeners.has(event) ? this.listeners.get(event).length : 0
    const onceCount = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0
    return normalCount + onceCount
  }

  /**
   * 获取所有事件名称
   * @returns {Array} 事件名称数组
   */
  eventNames() {
    const names = new Set()

    this.listeners.forEach((_, event) => names.add(event))
    this.onceListeners.forEach((_, event) => names.add(event))

    return Array.from(names)
  }

  /**
   * 获取指定事件的监听器
   * @param {string} event - 事件名称
   * @returns {Array} 监听器数组
   */
  listeners(event) {
    const result = []

    if (this.listeners.has(event)) {
      result.push(...this.listeners.get(event).map((item) => item.listener))
    }

    if (this.onceListeners.has(event)) {
      result.push(...this.onceListeners.get(event).map((item) => item.listener))
    }

    return result
  }

  /**
   * 生成监听器ID
   * @returns {string} 监听器ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalListeners: this.getTotalListenerCount(),
      eventCount: this.eventNames().length,
    }
  }

  /**
   * 获取总监听器数量
   * @returns {number} 总监听器数量
   */
  getTotalListenerCount() {
    let count = 0

    this.listeners.forEach((listeners) => {
      count += listeners.length
    })

    this.onceListeners.forEach((listeners) => {
      count += listeners.length
    })

    return count
  }
}

/**
 * 事件发射器类（简化版）
 */
class EventEmitter extends EventManager {
  constructor(options = {}) {
    super(options)
  }
}

/**
 * 事件队列类
 */
class EventQueue {
  constructor(options = {}) {
    this.options = {
      maxSize: 1000,
      autoProcess: true,
      processInterval: 10,
      enablePriority: false,
      ...options,
    }

    this.queue = []
    this.processing = false
    this.processTimer = null
    this.eventManager = new EventManager()

    if (this.options.autoProcess) {
      this.startProcessing()
    }
  }

  /**
   * 添加事件到队列
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @param {Object} options - 选项
   */
  enqueue(event, data, options = {}) {
    const eventItem = {
      event,
      data,
      options,
      timestamp: Date.now(),
      priority: options.priority || 0,
      id: this.generateEventId(),
    }

    // 检查队列大小
    if (this.queue.length >= this.options.maxSize) {
      console.warn('事件队列已满，移除最旧的事件')
      this.queue.shift()
    }

    // 根据优先级插入
    if (this.options.enablePriority) {
      let insertIndex = this.queue.length
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].priority < eventItem.priority) {
          insertIndex = i
          break
        }
      }
      this.queue.splice(insertIndex, 0, eventItem)
    } else {
      this.queue.push(eventItem)
    }

    return eventItem.id
  }

  /**
   * 从队列中移除事件
   * @returns {Object|null} 事件项
   */
  dequeue() {
    return this.queue.shift() || null
  }

  /**
   * 处理队列中的事件
   */
  processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    const eventItem = this.dequeue()
    if (eventItem) {
      try {
        this.eventManager.emit('process', eventItem)
        this.eventManager.emit(eventItem.event, eventItem.data, eventItem.options)
      } catch (error) {
        console.error('处理队列事件出错:', error)
        this.eventManager.emit('error', error, eventItem)
      }
    }

    this.processing = false
  }

  /**
   * 开始自动处理队列
   */
  startProcessing() {
    if (this.processTimer) {
      return
    }

    this.processTimer = setInterval(() => {
      this.processQueue()
    }, this.options.processInterval)
  }

  /**
   * 停止自动处理队列
   */
  stopProcessing() {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue = []
  }

  /**
   * 获取队列大小
   * @returns {number} 队列大小
   */
  size() {
    return this.queue.length
  }

  /**
   * 检查队列是否为空
   * @returns {boolean} 是否为空
   */
  isEmpty() {
    return this.queue.length === 0
  }

  /**
   * 生成事件ID
   * @returns {string} 事件ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  on(event, listener) {
    return this.eventManager.on(event, listener)
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  off(event, listener) {
    return this.eventManager.off(event, listener)
  }

  /**
   * 销毁队列
   */
  destroy() {
    this.stopProcessing()
    this.clear()
    this.eventManager.removeAllListeners()
  }
}

/**
 * 事件总线类
 */
class EventBus {
  constructor(options = {}) {
    this.options = {
      enableNamespace: true,
      enableWildcard: true,
      separator: '.',
      wildcardChar: '*',
      ...options,
    }

    this.eventManager = new EventManager()
    this.namespaces = new Map()
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @param {Object} options - 选项
   */
  publish(event, data, options = {}) {
    // 处理命名空间
    if (this.options.enableNamespace && event.includes(this.options.separator)) {
      const parts = event.split(this.options.separator)
      const namespace = parts.slice(0, -1).join(this.options.separator)

      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, new Set())
      }

      this.namespaces.get(namespace).add(event)
    }

    // 发射原始事件
    this.eventManager.emit(event, data, options)

    // 处理通配符事件
    if (this.options.enableWildcard) {
      this.handleWildcardEvents(event, data, options)
    }
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 选项
   */
  subscribe(event, listener, options = {}) {
    return this.eventManager.on(event, listener, options)
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   */
  unsubscribe(event, listener) {
    return this.eventManager.off(event, listener)
  }

  /**
   * 一次性订阅事件
   * @param {string} event - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 选项
   */
  subscribeOnce(event, listener, options = {}) {
    return this.eventManager.once(event, listener, options)
  }

  /**
   * 处理通配符事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @param {Object} options - 选项
   */
  handleWildcardEvents(event, data, options) {
    const eventNames = this.eventManager.eventNames()

    eventNames.forEach((eventName) => {
      if (eventName.includes(this.options.wildcardChar)) {
        if (this.matchWildcard(eventName, event)) {
          this.eventManager.emit(eventName, data, options)
        }
      }
    })
  }

  /**
   * 匹配通配符
   * @param {string} pattern - 通配符模式
   * @param {string} event - 事件名称
   * @returns {boolean} 是否匹配
   */
  matchWildcard(pattern, event) {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(event)
  }

  /**
   * 获取命名空间下的所有事件
   * @param {string} namespace - 命名空间
   * @returns {Array} 事件数组
   */
  getNamespaceEvents(namespace) {
    return this.namespaces.has(namespace) ? Array.from(this.namespaces.get(namespace)) : []
  }

  /**
   * 清空命名空间
   * @param {string} namespace - 命名空间
   */
  clearNamespace(namespace) {
    const events = this.getNamespaceEvents(namespace)
    events.forEach((event) => {
      this.eventManager.removeAllListeners(event)
    })
    this.namespaces.delete(namespace)
  }

  /**
   * 获取所有命名空间
   * @returns {Array} 命名空间数组
   */
  getNamespaces() {
    return Array.from(this.namespaces.keys())
  }

  /**
   * 销毁事件总线
   */
  destroy() {
    this.eventManager.removeAllListeners()
    this.namespaces.clear()
  }
}

export default EventUtils
export { EventManager, EventEmitter, EventQueue, EventBus }
