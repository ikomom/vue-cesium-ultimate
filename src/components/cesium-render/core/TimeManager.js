/**
 * 时间管理器 - 负责时间轴控制和动态数据更新
 * 支持时间范围管理、动态数据加载、时间插值和播放控制
 */

import * as Cesium from 'cesium'

class TimeManager {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.clock = viewer.clock

    // 配置选项
    this.options = {
      autoPlay: false,
      playbackRate: 1.0,
      timeStep: 60, // 秒
      bufferTime: 3600, // 缓冲时间（秒）
      maxDataAge: 86400, // 最大数据年龄（秒）
      enableInterpolation: true,
      interpolationMethod: 'linear', // linear, spline, step
      ...options,
    }

    // 时间状态
    this.timeState = {
      currentTime: null,
      startTime: null,
      endTime: null,
      isPlaying: false,
      playbackRate: this.options.playbackRate,
      direction: 1, // 1: forward, -1: backward
    }

    // 时间范围管理
    this.timeRanges = new Map() // layerId -> {start, end, data}
    this.activeTimeRange = null

    // 数据缓存
    this.dataCache = new Map() // timeKey -> data
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: 1000,
    }

    // 动态数据管理
    this.dynamicData = new Map() // layerId -> DynamicDataSource
    this.dataLoaders = new Map() // layerId -> DataLoader

    // 时间事件
    this.timeEvents = new Map() // eventId -> TimeEvent
    this.eventQueue = []

    // 插值器
    this.interpolators = new Map([
      ['linear', this.linearInterpolation.bind(this)],
      ['spline', this.splineInterpolation.bind(this)],
      ['step', this.stepInterpolation.bind(this)],
    ])

    // 事件处理器
    this.eventHandlers = new Map()

    // 性能监控
    this.performance = {
      lastUpdateTime: 0,
      updateDuration: 0,
      dataLoadTime: 0,
      interpolationTime: 0,
    }

    this.init()
  }

  /**
   * 初始化时间管理器
   */
  init() {
    // 监听时钟变化
    this.clock.onTick.addEventListener(this.onClockTick.bind(this))

    // 设置初始时间
    this.timeState.currentTime = this.clock.currentTime

    // 启动更新循环
    this.startUpdateLoop()
  }

  /**
   * 设置时间范围
   * @param {Object} timeRange - 时间范围 {start, end}
   * @param {string} layerId - 图层ID（可选）
   */
  setTimeRange(timeRange, layerId = 'global') {
    const startTime = this.parseTime(timeRange.start)
    const endTime = this.parseTime(timeRange.end)

    if (!startTime || !endTime) {
      throw new Error('Invalid time range')
    }

    const range = {
      start: startTime,
      end: endTime,
      duration: Cesium.JulianDate.secondsDifference(endTime, startTime),
    }

    this.timeRanges.set(layerId, range)

    // 如果是全局时间范围，更新时钟
    if (layerId === 'global') {
      this.activeTimeRange = range
      this.updateClockRange(range)
    }

    // 触发事件
    this.emit('timeRangeChanged', { layerId, range })
  }

  /**
   * 获取时间范围
   * @param {string} layerId - 图层ID
   * @returns {Object|null} 时间范围
   */
  getTimeRange(layerId = 'global') {
    return this.timeRanges.get(layerId) || null
  }

  /**
   * 设置当前时间
   * @param {*} time - 时间值
   */
  setCurrentTime(time) {
    const julianTime = this.parseTime(time)
    if (!julianTime) {
      throw new Error('Invalid time value')
    }

    this.timeState.currentTime = julianTime
    this.clock.currentTime = julianTime

    // 触发时间更新
    this.onTimeChanged(julianTime)
  }

  /**
   * 获取当前时间
   * @returns {Cesium.JulianDate} 当前时间
   */
  getCurrentTime() {
    return this.timeState.currentTime
  }

  /**
   * 播放控制
   */
  play() {
    this.timeState.isPlaying = true
    this.clock.shouldAnimate = true
    this.emit('playStateChanged', { isPlaying: true })
  }

  /**
   * 暂停控制
   */
  pause() {
    this.timeState.isPlaying = false
    this.clock.shouldAnimate = false
    this.emit('playStateChanged', { isPlaying: false })
  }

  /**
   * 停止控制
   */
  stop() {
    this.pause()
    if (this.activeTimeRange) {
      this.setCurrentTime(this.activeTimeRange.start)
    }
    this.emit('stopped')
  }

  /**
   * 设置播放速率
   * @param {number} rate - 播放速率
   */
  setPlaybackRate(rate) {
    this.timeState.playbackRate = rate
    this.clock.multiplier = rate
    this.emit('playbackRateChanged', { rate })
  }

  /**
   * 设置播放方向
   * @param {number} direction - 方向 (1: forward, -1: backward)
   */
  setDirection(direction) {
    this.timeState.direction = direction
    this.clock.multiplier = Math.abs(this.clock.multiplier) * direction
    this.emit('directionChanged', { direction })
  }

  /**
   * 跳转到指定时间
   * @param {*} time - 目标时间
   */
  jumpTo(time) {
    this.setCurrentTime(time)
    this.emit('jumped', { time: this.timeState.currentTime })
  }

  /**
   * 步进控制
   * @param {number} steps - 步数（正数向前，负数向后）
   */
  step(steps = 1) {
    const currentTime = this.timeState.currentTime
    const stepSeconds = this.options.timeStep * steps
    const newTime = Cesium.JulianDate.addSeconds(currentTime, stepSeconds, new Cesium.JulianDate())

    this.setCurrentTime(newTime)
    this.emit('stepped', { steps, time: newTime })
  }

  /**
   * 注册动态数据源
   * @param {string} layerId - 图层ID
   * @param {Object} dataSource - 数据源配置
   */
  registerDynamicDataSource(layerId, dataSource) {
    const dynamicSource = new DynamicDataSource(layerId, dataSource, this)
    this.dynamicData.set(layerId, dynamicSource)

    // 注册数据加载器
    if (dataSource.loader) {
      this.dataLoaders.set(layerId, dataSource.loader)
    }

    this.emit('dynamicDataSourceRegistered', { layerId, dataSource })
  }

  /**
   * 移除动态数据源
   * @param {string} layerId - 图层ID
   */
  removeDynamicDataSource(layerId) {
    const dynamicSource = this.dynamicData.get(layerId)
    if (dynamicSource) {
      dynamicSource.destroy()
      this.dynamicData.delete(layerId)
    }

    this.dataLoaders.delete(layerId)
    this.emit('dynamicDataSourceRemoved', { layerId })
  }

  /**
   * 获取指定时间的数据
   * @param {string} layerId - 图层ID
   * @param {Cesium.JulianDate} time - 时间
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 数据数组
   */
  async getDataAtTime(layerId, time, options = {}) {
    const startTime = performance.now()

    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(layerId, time)
      const cachedData = this.dataCache.get(cacheKey)

      if (cachedData) {
        this.cacheStats.hits++
        return cachedData
      }

      this.cacheStats.misses++

      // 从动态数据源获取数据
      const dynamicSource = this.dynamicData.get(layerId)
      let data = []

      if (dynamicSource) {
        data = await dynamicSource.getDataAtTime(time, options)
      } else {
        // 从数据加载器获取数据
        const loader = this.dataLoaders.get(layerId)
        if (loader) {
          data = await loader.loadDataAtTime(time, options)
        }
      }

      // 应用插值
      if (this.options.enableInterpolation && data.length > 0) {
        data = this.interpolateData(data, time, options)
      }

      // 缓存数据
      this.cacheData(cacheKey, data)

      return data
    } catch (error) {
      console.error('Failed to get data at time:', error)
      return []
    } finally {
      this.performance.dataLoadTime = performance.now() - startTime
    }
  }

  /**
   * 获取时间范围内的数据
   * @param {string} layerId - 图层ID
   * @param {Object} timeRange - 时间范围 {start, end}
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 数据数组
   */
  async getDataInTimeRange(layerId, timeRange, options = {}) {
    const startTime = this.parseTime(timeRange.start)
    const endTime = this.parseTime(timeRange.end)

    if (!startTime || !endTime) {
      throw new Error('Invalid time range')
    }

    const dynamicSource = this.dynamicData.get(layerId)
    if (dynamicSource) {
      return await dynamicSource.getDataInTimeRange({ start: startTime, end: endTime }, options)
    }

    const loader = this.dataLoaders.get(layerId)
    if (loader) {
      return await loader.loadDataInTimeRange({ start: startTime, end: endTime }, options)
    }

    return []
  }

  /**
   * 预加载数据
   * @param {string} layerId - 图层ID
   * @param {Cesium.JulianDate} centerTime - 中心时间
   * @param {number} bufferSeconds - 缓冲时间（秒）
   */
  async preloadData(layerId, centerTime, bufferSeconds = this.options.bufferTime) {
    const startTime = Cesium.JulianDate.addSeconds(
      centerTime,
      -bufferSeconds / 2,
      new Cesium.JulianDate(),
    )
    const endTime = Cesium.JulianDate.addSeconds(
      centerTime,
      bufferSeconds / 2,
      new Cesium.JulianDate(),
    )

    try {
      await this.getDataInTimeRange(layerId, { start: startTime, end: endTime })
    } catch (error) {
      console.warn('Failed to preload data:', error)
    }
  }

  /**
   * 插值数据
   * @param {Array} data - 原始数据
   * @param {Cesium.JulianDate} time - 目标时间
   * @param {Object} options - 选项
   * @returns {Array} 插值后的数据
   */
  interpolateData(data, time, options = {}) {
    const startTime = performance.now()

    try {
      const method = options.interpolationMethod || this.options.interpolationMethod
      const interpolator = this.interpolators.get(method)

      if (!interpolator) {
        console.warn(`Unknown interpolation method: ${method}`)
        return data
      }

      return interpolator(data, time, options)
    } finally {
      this.performance.interpolationTime = performance.now() - startTime
    }
  }

  /**
   * 线性插值
   * @param {Array} data - 数据数组
   * @param {Cesium.JulianDate} time - 目标时间
   * @param {Object} options - 选项
   * @returns {Array} 插值后的数据
   */
  linearInterpolation(data, time, options) {
    return data.map((item) => {
      if (!item.trajectory || item.trajectory.length < 2) {
        return item
      }

      const trajectory = item.trajectory
      const targetTime = Cesium.JulianDate.toIso8601(time)

      // 找到时间范围
      let beforeIndex = -1
      let afterIndex = -1

      for (let i = 0; i < trajectory.length - 1; i++) {
        if (trajectory[i].time <= targetTime && trajectory[i + 1].time >= targetTime) {
          beforeIndex = i
          afterIndex = i + 1
          break
        }
      }

      if (beforeIndex === -1 || afterIndex === -1) {
        return item
      }

      const before = trajectory[beforeIndex]
      const after = trajectory[afterIndex]

      // 计算插值因子
      const beforeTime = new Date(before.time).getTime()
      const afterTime = new Date(after.time).getTime()
      const currentTime = new Date(targetTime).getTime()

      const factor = (currentTime - beforeTime) / (afterTime - beforeTime)

      // 插值位置
      const interpolatedPosition = {
        longitude:
          before.position.longitude +
          (after.position.longitude - before.position.longitude) * factor,
        latitude:
          before.position.latitude + (after.position.latitude - before.position.latitude) * factor,
        height: before.position.height + (after.position.height - before.position.height) * factor,
      }

      // 插值属性
      const interpolatedProperties = {}
      if (before.properties && after.properties) {
        Object.keys(before.properties).forEach((key) => {
          if (
            typeof before.properties[key] === 'number' &&
            typeof after.properties[key] === 'number'
          ) {
            interpolatedProperties[key] =
              before.properties[key] + (after.properties[key] - before.properties[key]) * factor
          } else {
            interpolatedProperties[key] =
              factor < 0.5 ? before.properties[key] : after.properties[key]
          }
        })
      }

      return {
        ...item,
        position: interpolatedPosition,
        properties: {
          ...item.properties,
          ...interpolatedProperties,
        },
        _interpolated: true,
        _interpolationFactor: factor,
      }
    })
  }

  /**
   * 样条插值（简化实现）
   * @param {Array} data - 数据数组
   * @param {Cesium.JulianDate} time - 目标时间
   * @param {Object} options - 选项
   * @returns {Array} 插值后的数据
   */
  splineInterpolation(data, time, options) {
    // 简化实现，实际应该使用更复杂的样条插值算法
    return this.linearInterpolation(data, time, options)
  }

  /**
   * 阶跃插值
   * @param {Array} data - 数据数组
   * @param {Cesium.JulianDate} time - 目标时间
   * @param {Object} options - 选项
   * @returns {Array} 插值后的数据
   */
  stepInterpolation(data, time, options) {
    return data.map((item) => {
      if (!item.trajectory || item.trajectory.length === 0) {
        return item
      }

      const trajectory = item.trajectory
      const targetTime = Cesium.JulianDate.toIso8601(time)

      // 找到最近的时间点
      let closestIndex = 0
      let minDiff = Math.abs(
        new Date(trajectory[0].time).getTime() - new Date(targetTime).getTime(),
      )

      for (let i = 1; i < trajectory.length; i++) {
        const diff = Math.abs(
          new Date(trajectory[i].time).getTime() - new Date(targetTime).getTime(),
        )
        if (diff < minDiff) {
          minDiff = diff
          closestIndex = i
        }
      }

      const closestPoint = trajectory[closestIndex]

      return {
        ...item,
        position: closestPoint.position,
        properties: {
          ...item.properties,
          ...closestPoint.properties,
        },
        _interpolated: false,
        _closestIndex: closestIndex,
      }
    })
  }

  /**
   * 添加时间事件
   * @param {Object} event - 时间事件
   */
  addTimeEvent(event) {
    const timeEvent = {
      id: event.id || this.generateEventId(),
      time: this.parseTime(event.time),
      type: event.type || 'custom',
      data: event.data || {},
      callback: event.callback,
      once: event.once !== false,
    }

    this.timeEvents.set(timeEvent.id, timeEvent)
    this.sortEventQueue()

    this.emit('timeEventAdded', timeEvent)
  }

  /**
   * 移除时间事件
   * @param {string} eventId - 事件ID
   */
  removeTimeEvent(eventId) {
    const removed = this.timeEvents.delete(eventId)
    if (removed) {
      this.sortEventQueue()
      this.emit('timeEventRemoved', { eventId })
    }
  }

  /**
   * 时钟tick处理
   * @param {Cesium.Clock} clock - 时钟对象
   */
  onClockTick(clock) {
    const currentTime = clock.currentTime
    this.timeState.currentTime = currentTime

    // 处理时间事件
    this.processTimeEvents(currentTime)

    // 触发时间变化事件
    this.onTimeChanged(currentTime)
  }

  /**
   * 时间变化处理
   * @param {Cesium.JulianDate} time - 当前时间
   */
  onTimeChanged(time) {
    const startTime = performance.now()

    // 预加载数据
    this.dynamicData.forEach((source, layerId) => {
      this.preloadData(layerId, time)
    })

    // 清理过期缓存
    this.cleanupCache(time)

    // 触发时间变化事件
    this.emit('timeChanged', { time })

    this.performance.lastUpdateTime = performance.now() - startTime
  }

  /**
   * 处理时间事件
   * @param {Cesium.JulianDate} currentTime - 当前时间
   */
  processTimeEvents(currentTime) {
    const currentTimeSeconds = Cesium.JulianDate.toDate(currentTime).getTime()

    this.eventQueue.forEach((event) => {
      const eventTimeSeconds = Cesium.JulianDate.toDate(event.time).getTime()

      if (Math.abs(currentTimeSeconds - eventTimeSeconds) < 1000) {
        // 1秒误差
        try {
          if (event.callback) {
            event.callback(event.data)
          }

          this.emit('timeEventTriggered', event)

          if (event.once) {
            this.removeTimeEvent(event.id)
          }
        } catch (error) {
          console.error('Time event callback error:', error)
        }
      }
    })
  }

  /**
   * 排序事件队列
   */
  sortEventQueue() {
    this.eventQueue = Array.from(this.timeEvents.values()).sort((a, b) => {
      return Cesium.JulianDate.compare(a.time, b.time)
    })
  }

  /**
   * 更新时钟范围
   * @param {Object} range - 时间范围
   */
  updateClockRange(range) {
    this.clock.startTime = range.start
    this.clock.stopTime = range.end
    this.clock.currentTime = range.start

    // 设置时钟模式
    this.clock.clockRange = Cesium.ClockRange.LOOP_STOP
  }

  /**
   * 解析时间
   * @param {*} time - 时间值
   * @returns {Cesium.JulianDate|null} JulianDate对象
   */
  parseTime(time) {
    if (!time) return null

    if (time instanceof Cesium.JulianDate) {
      return time
    }

    if (typeof time === 'string') {
      try {
        return Cesium.JulianDate.fromIso8601(time)
      } catch {
        return Cesium.JulianDate.fromDate(new Date(time))
      }
    }

    if (typeof time === 'number') {
      return Cesium.JulianDate.fromDate(new Date(time))
    }

    if (time instanceof Date) {
      return Cesium.JulianDate.fromDate(time)
    }

    return null
  }

  /**
   * 生成缓存键
   * @param {string} layerId - 图层ID
   * @param {Cesium.JulianDate} time - 时间
   * @returns {string} 缓存键
   */
  generateCacheKey(layerId, time) {
    const timeStr = Cesium.JulianDate.toIso8601(time)
    return `${layerId}_${timeStr}`
  }

  /**
   * 缓存数据
   * @param {string} key - 缓存键
   * @param {*} data - 数据
   */
  cacheData(key, data) {
    if (this.cacheStats.size >= this.cacheStats.maxSize) {
      // 清理最旧的缓存
      const firstKey = this.dataCache.keys().next().value
      this.dataCache.delete(firstKey)
      this.cacheStats.size--
    }

    this.dataCache.set(key, data)
    this.cacheStats.size++
  }

  /**
   * 清理过期缓存
   * @param {Cesium.JulianDate} currentTime - 当前时间
   */
  cleanupCache(currentTime) {
    const maxAge = this.options.maxDataAge
    const cutoffTime = Cesium.JulianDate.addSeconds(currentTime, -maxAge, new Cesium.JulianDate())

    for (const [key, data] of this.dataCache.entries()) {
      const keyTime = this.extractTimeFromCacheKey(key)
      if (keyTime && Cesium.JulianDate.lessThan(keyTime, cutoffTime)) {
        this.dataCache.delete(key)
        this.cacheStats.size--
      }
    }
  }

  /**
   * 从缓存键提取时间
   * @param {string} key - 缓存键
   * @returns {Cesium.JulianDate|null} 时间
   */
  extractTimeFromCacheKey(key) {
    const parts = key.split('_')
    if (parts.length >= 2) {
      const timeStr = parts.slice(1).join('_')
      return this.parseTime(timeStr)
    }
    return null
  }

  /**
   * 生成事件ID
   * @returns {string} 事件ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 启动更新循环
   */
  startUpdateLoop() {
    const update = () => {
      this.performance.updateDuration = performance.now() - this.performance.lastUpdateTime
      requestAnimationFrame(update)
    }
    update()
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      cacheStats: { ...this.cacheStats },
      timeState: { ...this.timeState },
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return { ...this.cacheStats }
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.dataCache.clear()
    this.cacheStats.size = 0
    this.cacheStats.hits = 0
    this.cacheStats.misses = 0
  }

  /**
   * 设置实体管理器
   * @param {EntityManager} entityManager - 实体管理器实例
   */
  setEntityManager(entityManager) {
    this.entityManager = entityManager
    
    // 监听实体管理器事件
    if (entityManager && entityManager.on) {
      entityManager.on('entityCreated', this.onEntityCreated.bind(this))
      entityManager.on('entityUpdated', this.onEntityUpdated.bind(this))
      entityManager.on('entityRemoved', this.onEntityRemoved.bind(this))
    }
  }

  /**
   * 实体创建处理
   * @param {Object} event - 实体创建事件
   */
  onEntityCreated(event) {
    // 处理新创建的实体的时间相关属性
    if (event.entity && event.data && event.data.timeDependent) {
      this.setupTimeBasedEntity(event.entity, event.data)
    }
  }

  /**
   * 实体更新处理
   * @param {Object} event - 实体更新事件
   */
  onEntityUpdated(event) {
    // 处理实体更新的时间相关属性
    if (event.entity && event.data && event.data.timeDependent) {
      this.updateTimeBasedEntity(event.entity, event.data)
    }
  }

  /**
   * 实体移除处理
   * @param {Object} event - 实体移除事件
   */
  onEntityRemoved(event) {
    // 清理时间相关的资源
    this.cleanupTimeBasedEntity(event.entityId)
  }

  /**
   * 设置基于时间的实体
   * @param {Cesium.Entity} entity - 实体对象
   * @param {Object} data - 实体数据
   */
  setupTimeBasedEntity(entity, data) {
    // 这里可以根据需要设置时间相关的属性
    // 具体实现根据业务需求
  }

  /**
   * 更新基于时间的实体
   * @param {Cesium.Entity} entity - 实体对象
   * @param {Object} data - 实体数据
   */
  updateTimeBasedEntity(entity, data) {
    // 这里可以根据时间更新实体的属性
    // 具体实现根据业务需求
  }

  /**
   * 清理基于时间的实体
   * @param {string} entityId - 实体ID
   */
  cleanupTimeBasedEntity(entityId) {
    // 清理与该实体相关的时间资源
    // 具体实现根据业务需求
  }

  /**
   * 更新时间
   * @param {Cesium.JulianDate} currentTime - 当前时间
   */
  updateTime(currentTime) {
    if (!currentTime) return
    
    this.timeState.currentTime = currentTime
    
    // 触发时间变化事件
    this.onTimeChanged(currentTime)
    
    // 更新性能统计
    this.performance.lastUpdateTime = performance.now()
    
    // 处理时间事件
    this.processTimeEvents(currentTime)
    
    // 触发时间更新事件
    this.emit('timeChanged', {
      currentTime: currentTime,
      timeState: this.timeState
    })
  }

  /**
   * 事件发射器
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  emit(eventName, data) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        } catch (error) {
          console.error('Event handler error:', error)
        }
      })
    }
  }

  /**
   * 监听事件
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName).push(handler)
  }

  /**
   * 移除事件监听
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  off(eventName, handler) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      timeState: {
        currentTime: this.timeState.currentTime ? Cesium.JulianDate.toIso8601(this.timeState.currentTime) : null,
        startTime: this.timeState.startTime ? Cesium.JulianDate.toIso8601(this.timeState.startTime) : null,
        endTime: this.timeState.endTime ? Cesium.JulianDate.toIso8601(this.timeState.endTime) : null,
        isPlaying: this.timeState.isPlaying,
        playbackRate: this.timeState.playbackRate,
        direction: this.timeState.direction
      },
      timeRanges: this.timeRanges.size,
      activeTimeRange: this.activeTimeRange ? {
        start: Cesium.JulianDate.toIso8601(this.activeTimeRange.start),
        end: Cesium.JulianDate.toIso8601(this.activeTimeRange.end),
        duration: this.activeTimeRange.duration
      } : null,
      cache: {
        size: this.cacheStats.size,
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        maxSize: this.cacheStats.maxSize,
        hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 ? 
          (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%' : '0%'
      },
      dynamicData: this.dynamicData.size,
      timeEvents: this.timeEvents.size,
      eventQueue: this.eventQueue.length,
      performance: {
        lastUpdateTime: this.performance.lastUpdateTime,
        updateDuration: this.performance.updateDuration,
        dataLoadTime: this.performance.dataLoadTime,
        interpolationTime: this.performance.interpolationTime
      }
    }
  }

  /**
   * 销毁时间管理器
   */
  destroy() {
    // 移除时钟监听
    this.clock.onTick.removeEventListener(this.onClockTick)

    // 清理动态数据源
    this.dynamicData.forEach((source) => source.destroy())
    this.dynamicData.clear()

    // 清理缓存
    this.clearCache()

    // 清理事件
    this.timeEvents.clear()
    this.eventQueue = []
    this.eventHandlers.clear()
  }
}

/**
 * 动态数据源
 */
class DynamicDataSource {
  constructor(layerId, config, timeManager) {
    this.layerId = layerId
    this.config = config
    this.timeManager = timeManager

    this.dataBuffer = new Map() // time -> data
    this.loadingPromises = new Map() // time -> Promise
  }

  /**
   * 获取指定时间的数据
   * @param {Cesium.JulianDate} time - 时间
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 数据数组
   */
  async getDataAtTime(time, options = {}) {
    const timeKey = Cesium.JulianDate.toIso8601(time)

    // 检查缓冲区
    if (this.dataBuffer.has(timeKey)) {
      return this.dataBuffer.get(timeKey)
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(timeKey)) {
      return await this.loadingPromises.get(timeKey)
    }

    // 开始加载数据
    const loadPromise = this.loadData(time, options)
    this.loadingPromises.set(timeKey, loadPromise)

    try {
      const data = await loadPromise
      this.dataBuffer.set(timeKey, data)
      return data
    } finally {
      this.loadingPromises.delete(timeKey)
    }
  }

  /**
   * 获取时间范围内的数据
   * @param {Object} timeRange - 时间范围
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 数据数组
   */
  async getDataInTimeRange(timeRange, options = {}) {
    if (this.config.loader && this.config.loader.loadDataInTimeRange) {
      return await this.config.loader.loadDataInTimeRange(timeRange, options)
    }

    // 分段加载
    const data = []
    const stepSeconds = options.stepSeconds || 60
    let currentTime = timeRange.start

    while (Cesium.JulianDate.lessThan(currentTime, timeRange.end)) {
      const timeData = await this.getDataAtTime(currentTime, options)
      data.push(...timeData)
      currentTime = Cesium.JulianDate.addSeconds(currentTime, stepSeconds, new Cesium.JulianDate())
    }

    return data
  }

  /**
   * 加载数据
   * @param {Cesium.JulianDate} time - 时间
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 数据数组
   */
  async loadData(time, options) {
    if (this.config.loader && this.config.loader.loadDataAtTime) {
      return await this.config.loader.loadDataAtTime(time, options)
    }

    // 默认返回空数组
    return []
  }

  /**
   * 销毁数据源
   */
  destroy() {
    this.dataBuffer.clear()
    this.loadingPromises.clear()
  }
}

export default TimeManager
export { DynamicDataSource }
