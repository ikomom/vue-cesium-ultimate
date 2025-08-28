/**
 * 性能工具类 - 提供性能监控、优化建议、资源管理等功能
 */

class PerformanceUtils {
  // 性能监控数据
  static performanceData = {
    frameRate: [],
    renderTime: [],
    memoryUsage: [],
    entityCount: [],
    drawCalls: [],
    timestamps: [],
  }

  // 性能阈值
  static thresholds = {
    minFrameRate: 30,
    maxRenderTime: 16.67, // 60fps对应的帧时间
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxEntityCount: 10000,
    maxDrawCalls: 1000,
  }

  // 监控状态
  static isMonitoring = false
  static monitoringInterval = null
  static callbacks = {
    onPerformanceWarning: [],
    onPerformanceUpdate: [],
  }

  /**
   * 开始性能监控
   * @param {Object} options - 监控选项
   */
  static startMonitoring(options = {}) {
    if (this.isMonitoring) return

    const defaultOptions = {
      interval: 1000, // 监控间隔（毫秒）
      maxDataPoints: 100, // 最大数据点数
      enableMemoryMonitoring: true,
      enableFrameRateMonitoring: true,
    }

    const finalOptions = { ...defaultOptions, ...options }

    this.isMonitoring = true

    // 清空历史数据
    this.clearPerformanceData()

    // 开始监控循环
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceData(finalOptions)

      // 限制数据点数量
      if (this.performanceData.frameRate.length > finalOptions.maxDataPoints) {
        Object.keys(this.performanceData).forEach((key) => {
          this.performanceData[key].shift()
        })
      }

      // 检查性能警告
      this.checkPerformanceWarnings()

      // 触发更新回调
      this.callbacks.onPerformanceUpdate.forEach((callback) => {
        callback(this.getPerformanceStats())
      })
    }, finalOptions.interval)
  }

  /**
   * 停止性能监控
   */
  static stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * 收集性能数据
   * @param {Object} options - 收集选项
   */
  static collectPerformanceData(options) {
    const timestamp = Date.now()
    this.performanceData.timestamps.push(timestamp)

    // 收集帧率数据
    if (options.enableFrameRateMonitoring) {
      const frameRate = this.getCurrentFrameRate()
      this.performanceData.frameRate.push(frameRate)
    }

    // 收集渲染时间
    const renderTime = this.getCurrentRenderTime()
    this.performanceData.renderTime.push(renderTime)

    // 收集内存使用情况
    if (options.enableMemoryMonitoring && performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize
      this.performanceData.memoryUsage.push(memoryUsage)
    }

    // 收集实体数量（需要外部提供）
    const entityCount = this.getCurrentEntityCount()
    this.performanceData.entityCount.push(entityCount)

    // 收集绘制调用次数（估算）
    const drawCalls = this.estimateDrawCalls()
    this.performanceData.drawCalls.push(drawCalls)
  }

  /**
   * 获取当前帧率
   * @returns {number} 当前帧率
   */
  static getCurrentFrameRate() {
    // 简单的帧率估算
    if (this.performanceData.timestamps.length < 2) return 60

    const recent = this.performanceData.timestamps.slice(-10)
    if (recent.length < 2) return 60

    const totalTime = recent[recent.length - 1] - recent[0]
    const frameCount = recent.length - 1

    return frameCount > 0 ? Math.round((1000 * frameCount) / totalTime) : 60
  }

  /**
   * 获取当前渲染时间
   * @returns {number} 渲染时间（毫秒）
   */
  static getCurrentRenderTime() {
    // 使用Performance API估算渲染时间
    if (performance.now) {
      const entries = performance.getEntriesByType('measure')
      const renderEntries = entries.filter((entry) => entry.name.includes('render'))

      if (renderEntries.length > 0) {
        return renderEntries[renderEntries.length - 1].duration
      }
    }

    return 0
  }

  /**
   * 获取当前实体数量
   * @returns {number} 实体数量
   */
  static getCurrentEntityCount() {
    // 这个方法需要外部设置实体计数器
    return this.entityCounter || 0
  }

  /**
   * 设置实体计数器
   * @param {number} count - 实体数量
   */
  static setEntityCount(count) {
    this.entityCounter = count
  }

  /**
   * 估算绘制调用次数
   * @returns {number} 绘制调用次数
   */
  static estimateDrawCalls() {
    // 简单估算：实体数量的一定比例
    const entityCount = this.getCurrentEntityCount()
    return Math.ceil(entityCount * 0.1) // 假设每10个实体需要1次绘制调用
  }

  /**
   * 检查性能警告
   */
  static checkPerformanceWarnings() {
    const warnings = []

    // 检查帧率
    const currentFrameRate =
      this.performanceData.frameRate[this.performanceData.frameRate.length - 1]
    if (currentFrameRate < this.thresholds.minFrameRate) {
      warnings.push({
        type: 'frameRate',
        message: `帧率过低: ${currentFrameRate}fps (阈值: ${this.thresholds.minFrameRate}fps)`,
        severity: 'high',
        value: currentFrameRate,
        threshold: this.thresholds.minFrameRate,
      })
    }

    // 检查渲染时间
    const currentRenderTime =
      this.performanceData.renderTime[this.performanceData.renderTime.length - 1]
    if (currentRenderTime > this.thresholds.maxRenderTime) {
      warnings.push({
        type: 'renderTime',
        message: `渲染时间过长: ${currentRenderTime.toFixed(2)}ms (阈值: ${this.thresholds.maxRenderTime}ms)`,
        severity: 'medium',
        value: currentRenderTime,
        threshold: this.thresholds.maxRenderTime,
      })
    }

    // 检查内存使用
    const currentMemoryUsage =
      this.performanceData.memoryUsage[this.performanceData.memoryUsage.length - 1]
    if (currentMemoryUsage > this.thresholds.maxMemoryUsage) {
      warnings.push({
        type: 'memoryUsage',
        message: `内存使用过高: ${(currentMemoryUsage / 1024 / 1024).toFixed(2)}MB (阈值: ${(this.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB)`,
        severity: 'high',
        value: currentMemoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
      })
    }

    // 检查实体数量
    const currentEntityCount =
      this.performanceData.entityCount[this.performanceData.entityCount.length - 1]
    if (currentEntityCount > this.thresholds.maxEntityCount) {
      warnings.push({
        type: 'entityCount',
        message: `实体数量过多: ${currentEntityCount} (阈值: ${this.thresholds.maxEntityCount})`,
        severity: 'medium',
        value: currentEntityCount,
        threshold: this.thresholds.maxEntityCount,
      })
    }

    // 触发警告回调
    if (warnings.length > 0) {
      this.callbacks.onPerformanceWarning.forEach((callback) => {
        callback(warnings)
      })
    }
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  static getPerformanceStats() {
    const stats = {}

    Object.keys(this.performanceData).forEach((key) => {
      if (key === 'timestamps') return

      const data = this.performanceData[key]
      if (data.length === 0) {
        stats[key] = { current: 0, average: 0, min: 0, max: 0 }
        return
      }

      const current = data[data.length - 1] || 0
      const sum = data.reduce((a, b) => a + b, 0)
      const average = sum / data.length
      const min = Math.min(...data)
      const max = Math.max(...data)

      stats[key] = {
        current: Math.round(current * 100) / 100,
        average: Math.round(average * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
      }
    })

    return stats
  }

  /**
   * 获取性能建议
   * @returns {Array} 性能建议列表
   */
  static getPerformanceSuggestions() {
    const suggestions = []
    const stats = this.getPerformanceStats()

    // 基于帧率的建议
    if (stats.frameRate && stats.frameRate.average < this.thresholds.minFrameRate) {
      suggestions.push({
        type: 'frameRate',
        priority: 'high',
        title: '提高帧率',
        description: '当前帧率较低，建议减少实体数量或启用LOD优化',
        actions: [
          '启用实体聚类',
          '使用LOD（细节层次）优化',
          '减少同时显示的实体数量',
          '优化材质和纹理',
        ],
      })
    }

    // 基于内存使用的建议
    if (stats.memoryUsage && stats.memoryUsage.current > this.thresholds.maxMemoryUsage * 0.8) {
      suggestions.push({
        type: 'memory',
        priority: 'high',
        title: '优化内存使用',
        description: '内存使用接近阈值，建议进行内存优化',
        actions: ['清理未使用的实体', '使用对象池管理实体', '压缩纹理和模型', '定期执行垃圾回收'],
      })
    }

    // 基于实体数量的建议
    if (stats.entityCount && stats.entityCount.current > this.thresholds.maxEntityCount * 0.8) {
      suggestions.push({
        type: 'entities',
        priority: 'medium',
        title: '优化实体管理',
        description: '实体数量较多，建议使用优化策略',
        actions: ['实现视锥剔除', '使用实体聚类', '按需加载实体', '使用实例化渲染'],
      })
    }

    // 基于绘制调用的建议
    if (stats.drawCalls && stats.drawCalls.current > this.thresholds.maxDrawCalls * 0.8) {
      suggestions.push({
        type: 'drawCalls',
        priority: 'medium',
        title: '减少绘制调用',
        description: '绘制调用次数较多，建议进行批处理优化',
        actions: ['合并相似的几何体', '使用实例化渲染', '减少材质切换', '使用纹理图集'],
      })
    }

    return suggestions
  }

  /**
   * 清空性能数据
   */
  static clearPerformanceData() {
    Object.keys(this.performanceData).forEach((key) => {
      this.performanceData[key] = []
    })
  }

  /**
   * 设置性能阈值
   * @param {Object} thresholds - 新的阈值
   */
  static setThresholds(thresholds) {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * 添加性能回调
   * @param {string} event - 事件类型
   * @param {Function} callback - 回调函数
   */
  static on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback)
    }
  }

  /**
   * 移除性能回调
   * @param {string} event - 事件类型
   * @param {Function} callback - 回调函数
   */
  static off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback)
      if (index > -1) {
        this.callbacks[event].splice(index, 1)
      }
    }
  }

  /**
   * 创建性能分析器
   * @param {string} name - 分析器名称
   * @returns {Object} 性能分析器
   */
  static createProfiler(name) {
    return {
      name,
      startTime: null,
      endTime: null,
      duration: null,

      // 开始计时
      start() {
        this.startTime = performance.now()
        performance.mark(`${name}-start`)
      },

      // 结束计时
      end() {
        this.endTime = performance.now()
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
        this.duration = this.endTime - this.startTime
        return this.duration
      },

      // 获取持续时间
      getDuration() {
        return this.duration
      },

      // 重置
      reset() {
        this.startTime = null
        this.endTime = null
        this.duration = null
      },
    }
  }

  /**
   * 测量函数执行时间
   * @param {Function} fn - 要测量的函数
   * @param {string} name - 测量名称
   * @returns {*} 函数返回值
   */
  static measureFunction(fn, name = 'function') {
    const profiler = this.createProfiler(name)
    profiler.start()

    try {
      const result = fn()
      profiler.end()

      console.log(`${name} 执行时间: ${profiler.getDuration().toFixed(2)}ms`)

      return result
    } catch (error) {
      profiler.end()
      console.error(`${name} 执行出错:`, error)
      throw error
    }
  }

  /**
   * 异步测量函数执行时间
   * @param {Function} fn - 要测量的异步函数
   * @param {string} name - 测量名称
   * @returns {Promise} Promise对象
   */
  static async measureAsyncFunction(fn, name = 'asyncFunction') {
    const profiler = this.createProfiler(name)
    profiler.start()

    try {
      const result = await fn()
      profiler.end()

      console.log(`${name} 执行时间: ${profiler.getDuration().toFixed(2)}ms`)

      return result
    } catch (error) {
      profiler.end()
      console.error(`${name} 执行出错:`, error)
      throw error
    }
  }

  /**
   * 获取浏览器性能信息
   * @returns {Object} 浏览器性能信息
   */
  static getBrowserPerformanceInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      connection: null,
    }

    // 网络连接信息
    if (navigator.connection) {
      info.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
      }
    }

    // 内存信息
    if (performance.memory) {
      info.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      }
    }

    return info
  }

  /**
   * 生成性能报告
   * @returns {Object} 性能报告
   */
  static generatePerformanceReport() {
    const stats = this.getPerformanceStats()
    const suggestions = this.getPerformanceSuggestions()
    const browserInfo = this.getBrowserPerformanceInfo()

    return {
      timestamp: new Date().toISOString(),
      monitoringDuration:
        this.performanceData.timestamps.length > 0
          ? this.performanceData.timestamps[this.performanceData.timestamps.length - 1] -
            this.performanceData.timestamps[0]
          : 0,
      stats,
      suggestions,
      browserInfo,
      thresholds: this.thresholds,
      dataPoints: this.performanceData.timestamps.length,
    }
  }

  /**
   * 导出性能数据
   * @param {string} format - 导出格式（'json', 'csv'）
   * @returns {string} 导出的数据
   */
  static exportPerformanceData(format = 'json') {
    const report = this.generatePerformanceReport()

    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else if (format === 'csv') {
      // 简单的CSV导出
      const headers = [
        'timestamp',
        'frameRate',
        'renderTime',
        'memoryUsage',
        'entityCount',
        'drawCalls',
      ]
      const rows = []

      for (let i = 0; i < this.performanceData.timestamps.length; i++) {
        const row = [
          new Date(this.performanceData.timestamps[i]).toISOString(),
          this.performanceData.frameRate[i] || '',
          this.performanceData.renderTime[i] || '',
          this.performanceData.memoryUsage[i] || '',
          this.performanceData.entityCount[i] || '',
          this.performanceData.drawCalls[i] || '',
        ]
        rows.push(row.join(','))
      }

      return [headers.join(','), ...rows].join('\n')
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * 自动优化建议
   * @returns {Object} 自动优化配置
   */
  static getAutoOptimizationConfig() {
    const stats = this.getPerformanceStats()
    const config = {
      enableLOD: false,
      enableClustering: false,
      enableFrustumCulling: true,
      maxEntities: this.thresholds.maxEntityCount,
      textureQuality: 'high',
      shadowQuality: 'high',
      enableInstancing: false,
    }

    // 基于性能自动调整配置
    if (stats.frameRate && stats.frameRate.average < this.thresholds.minFrameRate) {
      config.enableLOD = true
      config.enableClustering = true
      config.maxEntities = Math.floor(this.thresholds.maxEntityCount * 0.7)
      config.textureQuality = 'medium'
      config.shadowQuality = 'medium'
    }

    if (stats.entityCount && stats.entityCount.current > this.thresholds.maxEntityCount * 0.8) {
      config.enableClustering = true
      config.enableInstancing = true
    }

    if (stats.memoryUsage && stats.memoryUsage.current > this.thresholds.maxMemoryUsage * 0.8) {
      config.textureQuality = 'low'
      config.maxEntities = Math.floor(this.thresholds.maxEntityCount * 0.5)
    }

    return config
  }
}

export default PerformanceUtils
