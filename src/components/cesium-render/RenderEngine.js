/**
 * 渲染引擎 - 主渲染引擎类，整合所有渲染组件
 * 提供统一的渲染接口，支持大数据渲染、动态更新、图层管理等功能
 */

import * as Cesium from 'cesium'
import DataAdapter from './core/DataAdapter.js'
import EntityManager from './core/EntityManager.js'
import TimeManager from './core/TimeManager.js'
import Layer from './core/Layer.js'
import RendererFactory from './renderers/RendererFactory.js'

class RenderEngine {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    window.viewer = viewer
    this.scene = viewer.scene
    this.camera = viewer.camera
    this.clock = viewer.clock

    // 配置选项
    this.options = {
      // 性能配置
      enableLOD: true, // 启用LOD
      enableCulling: true, // 启用视锥剔除
      enableBatching: true, // 启用批处理
      enableInstancing: true, // 启用实例化
      enableCaching: true, // 启用缓存

      // 渲染配置
      maxEntitiesPerLayer: 50000, // 每层最大实体数
      maxLayers: 100, // 最大图层数
      updateInterval: 16, // 更新间隔(ms)
      cullingInterval: 100, // 剔除间隔(ms)

      // 时间配置
      enableTimeFiltering: true, // 启用时间过滤
      timeBufferSize: 1000, // 时间缓冲区大小

      // 数据配置
      enableDataStreaming: true, // 启用数据流
      dataBufferSize: 10000, // 数据缓冲区大小

      ...options,
    }

    // 核心组件
    this.dataAdapter = null
    this.entityManager = null
    this.timeManager = null
    this.rendererFactory = null

    // 图层管理
    this.layers = new Map() // layerId -> Layer
    this.layerOrder = [] // 图层渲染顺序
    this.activeLayerIds = new Set() // 活跃图层ID

    // 数据管理
    this.dataStreams = new Map() // streamId -> DataStream
    this.dataBuffer = new Map() // dataId -> data
    this.pendingUpdates = new Map() // layerId -> updates[]

    // 渲染状态
    this.renderState = {
      isRendering: false,
      isPaused: false,
      lastRenderTime: 0,
      frameCount: 0,
      fps: 0,
    }

    // 性能统计
    this.stats = {
      totalEntities: 0,
      visibleEntities: 0,
      culledEntities: 0,
      batchedEntities: 0,
      instancedEntities: 0,
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      layerStats: new Map(),
    }

    // 事件处理器
    this.eventHandlers = new Map()

    // 更新循环
    this.updateLoop = null
    this.cullingLoop = null

    // 初始化
    this.initialize()
  }

  /**
   * 初始化渲染引擎
   */
  async initialize() {
    try {
      console.log('Initializing RenderEngine...')

      // 初始化核心组件
      await this.initializeComponents()

      // 设置事件监听
      this.setupEventListeners()

      // 启动更新循环
      this.startUpdateLoop()

      // 启动剔除循环
      if (this.options.enableCulling) {
        this.startCullingLoop()
      }

      console.log('RenderEngine initialized successfully')
      this.emit('initialized')
    } catch (error) {
      console.error('Failed to initialize RenderEngine:', error)
      throw error
    }
  }

  /**
   * 初始化核心组件
   */
  async initializeComponents() {
    // 初始化数据适配器
    this.dataAdapter = new DataAdapter({
      enableCaching: this.options.enableCaching,
      bufferSize: this.options.dataBufferSize,
    })

    // 初始化实体管理器
    this.entityManager = new EntityManager(this.viewer, {
      enableLOD: this.options.enableLOD,
      enableBatching: this.options.enableBatching,
      enableInstancing: this.options.enableInstancing,
      maxEntities: this.options.maxEntitiesPerLayer * this.options.maxLayers,
    })

    // 初始化时间管理器
    this.timeManager = new TimeManager(this.viewer, {
      enableTimeFiltering: this.options.enableTimeFiltering,
      bufferSize: this.options.timeBufferSize,
    })

    // 初始化渲染器工厂
    this.rendererFactory = new RendererFactory(this.viewer, {
      enableBatching: this.options.enableBatching,
      enableInstancing: this.options.enableInstancing,
    })

    // 组件间关联
    this.entityManager.setTimeManager(this.timeManager)
    this.timeManager.setEntityManager(this.entityManager)
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 相机变化事件
    this.camera.changed.addEventListener(() => {
      if (this.options.enableCulling) {
        this.scheduleUpdate('culling')
      }
    })

    // 时钟变化事件
    this.clock.onTick.addEventListener((clock) => {
      if (this.options.enableTimeFiltering) {
        this.timeManager.updateTime(clock.currentTime)
      }
    })

    // 场景渲染事件
    this.scene.preRender.addEventListener(() => {
      this.onPreRender()
    })

    this.scene.postRender.addEventListener(() => {
      this.onPostRender()
    })
  }

  /**
   * 创建图层
   * @param {string} layerId - 图层ID
   * @param {Object} options - 图层选项
   * @returns {Layer} 图层实例
   */
  createLayer(layerId, options = {}) {
    if (this.layers.has(layerId)) {
      console.warn(`Layer ${layerId} already exists`)
      return this.layers.get(layerId)
    }

    if (this.layers.size >= this.options.maxLayers) {
      throw new Error(`Maximum layer count (${this.options.maxLayers}) exceeded`)
    }

    const layer = new Layer(layerId, this, {
      ...options,
      maxEntities: this.options.maxEntitiesPerLayer,
      entityManager: this.entityManager,
      timeManager: this.timeManager,
      rendererFactory: this.rendererFactory,
      dataAdapter: this.dataAdapter,
    })

    // 设置图层事件监听
    layer.on('dataChanged', (data) => {
      this.onLayerDataChanged(layerId, data)
    })

    layer.on('visibilityChanged', (visible) => {
      this.onLayerVisibilityChanged(layerId, visible)
    })

    layer.on('destroyed', () => {
      this.onLayerDestroyed(layerId)
    })

    this.layers.set(layerId, layer)
    this.layerOrder.push(layerId)
    this.activeLayerIds.add(layerId)

    this.addLayer(layer)
    // 初始化图层统计
    this.stats.layerStats.set(layerId, {
      entityCount: 0,
      visibleCount: 0,
      renderTime: 0,
      memoryUsage: 0,
    })
    this.emit('layerCreated', { layerId, layer })
    return layer
  }

  /**
   * 添加图层到渲染引擎
   * @param {Layer} layer - 图层实例
   */
  addLayer(layer) {
    if (!layer || !layer.entityCollection) {
      console.warn('Invalid layer or missing entityCollection')
      return
    }

    // 将图层的实体集合添加到viewer中
    if (this.viewer && this.viewer.entities) {
      console.log('添加图层到渲染引擎', layer.entityCollection)

      // 将图层的entityCollection中的所有实体添加到viewer.entities
      layer.entityCollection.values.forEach((entity) => {
        this.viewer.entities.add(entity)
      })

      // 监听图层实体集合的变化
      layer.entityCollection.collectionChanged.addEventListener((collection, added, removed) => {
        // 添加新实体到viewer
        added.forEach((entity) => {
          this.viewer.entities.add(entity)
        })

        // 从viewer中移除实体
        removed.forEach((entity) => {
          this.viewer.entities.remove(entity)
        })
      })
    }
  }

  /**
   * 获取图层
   * @param {string} layerId - 图层ID
   * @returns {Layer|null} 图层实例
   */
  getLayer(layerId) {
    return this.layers.get(layerId) || null
  }

  /**
   * 移除图层
   * @param {string} layerId - 图层ID
   */
  removeLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`Layer ${layerId} not found`)
      return
    }

    // 从viewer.entities中移除图层的所有实体
    if (this.viewer && this.viewer.entities && layer.entityCollection) {
      layer.entityCollection.values.forEach((entity) => {
        this.viewer.entities.remove(entity)
      })
    }

    // 销毁图层
    layer.destroy()

    // 清理引用
    this.layers.delete(layerId)
    this.activeLayerIds.delete(layerId)
    this.stats.layerStats.delete(layerId)

    // 更新图层顺序
    const index = this.layerOrder.indexOf(layerId)
    if (index > -1) {
      this.layerOrder.splice(index, 1)
    }

    // 清理待处理更新
    this.pendingUpdates.delete(layerId)

    this.emit('layerRemoved', { layerId })
  }

  /**
   * 设置图层顺序
   * @param {Array} layerIds - 图层ID数组
   */
  setLayerOrder(layerIds) {
    // 验证图层ID
    const validLayerIds = layerIds.filter((id) => this.layers.has(id))

    if (validLayerIds.length !== layerIds.length) {
      console.warn('Some layer IDs are invalid')
    }

    this.layerOrder = validLayerIds

    // 更新图层渲染顺序
    this.updateLayerRenderOrder()

    this.emit('layerOrderChanged', { layerOrder: this.layerOrder })
  }

  /**
   * 设置图层可见性
   * @param {string} layerId - 图层ID
   * @param {boolean} visible - 是否可见
   */
  setLayerVisible(layerId, visible) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`Layer ${layerId} not found`)
      return
    }

    layer.setVisible(visible)

    if (visible) {
      this.activeLayerIds.add(layerId)
    } else {
      this.activeLayerIds.delete(layerId)
    }
  }

  /**
   * 添加数据到图层
   * @param {string} layerId - 图层ID
   * @param {Array} data - 数据数组
   * @param {Object} options - 选项
   */
  async addData(layerId, data, options = {}) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`)
    }

    try {
      // 适配数据
      const adaptedData = await this.dataAdapter.adaptData(data, options)

      // 添加到图层
      await layer.addData(adaptedData, options)

      // 更新统计
      this.updateLayerStats(layerId)

      this.emit('dataAdded', { layerId, data: adaptedData })
    } catch (error) {
      console.error(`Failed to add data to layer ${layerId}:`, error)
      throw error
    }
  }

  /**
   * 更新图层数据
   * @param {string} layerId - 图层ID
   * @param {Array} data - 数据数组
   * @param {Object} options - 选项
   */
  async updateData(layerId, data, options = {}) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`)
    }

    try {
      // 适配数据
      const adaptedData = await this.dataAdapter.adaptData(data, options)

      // 更新图层数据
      await layer.updateData(adaptedData, options)

      // 更新统计
      this.updateLayerStats(layerId)

      this.emit('dataUpdated', { layerId, data: adaptedData })
    } catch (error) {
      console.error(`Failed to update data in layer ${layerId}:`, error)
      throw error
    }
  }

  /**
   * 移除图层数据
   * @param {string} layerId - 图层ID
   * @param {Array} dataIds - 数据ID数组
   */
  async removeData(layerId, dataIds) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`)
    }

    try {
      await layer.removeData(dataIds)

      // 更新统计
      this.updateLayerStats(layerId)

      this.emit('dataRemoved', { layerId, dataIds })
    } catch (error) {
      console.error(`Failed to remove data from layer ${layerId}:`, error)
      throw error
    }
  }

  /**
   * 清空图层数据
   * @param {string} layerId - 图层ID
   */
  async clearLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`)
    }

    try {
      await layer.clear()

      // 更新统计
      this.updateLayerStats(layerId)

      this.emit('layerCleared', { layerId })
    } catch (error) {
      console.error(`Failed to clear layer ${layerId}:`, error)
      throw error
    }
  }

  /**
   * 设置时间范围
   * @param {Object} timeRange - 时间范围 {start, end}
   */
  setTimeRange(timeRange) {
    this.timeManager.setTimeRange(timeRange)

    // 更新所有图层的时间范围
    this.layers.forEach((layer) => {
      layer.setTimeRange(timeRange)
    })

    this.emit('timeRangeChanged', { timeRange })
  }

  /**
   * 设置当前时间
   * @param {Date} time - 当前时间
   */
  setCurrentTime(time) {
    this.timeManager.setCurrentTime(time)

    // 更新所有图层的当前时间
    this.layers.forEach((layer) => {
      layer.updateTime(time)
    })

    this.emit('currentTimeChanged', { time })
  }

  /**
   * 播放时间动画
   */
  play() {
    this.timeManager.play()
    this.renderState.isPaused = false
    this.emit('playStarted')
  }

  /**
   * 暂停时间动画
   */
  pause() {
    this.timeManager.pause()
    this.renderState.isPaused = true
    this.emit('playPaused')
  }

  /**
   * 停止时间动画
   */
  stop() {
    this.timeManager.stop()
    this.renderState.isPaused = true
    this.emit('playStopped')
  }

  /**
   * 启动更新循环
   */
  startUpdateLoop() {
    if (this.updateLoop) {
      return
    }

    const update = () => {
      if (!this.renderState.isPaused) {
        this.update()
      }
      this.updateLoop = requestAnimationFrame(update)
    }

    this.updateLoop = requestAnimationFrame(update)
  }

  /**
   * 停止更新循环
   */
  stopUpdateLoop() {
    if (this.updateLoop) {
      cancelAnimationFrame(this.updateLoop)
      this.updateLoop = null
    }
  }

  /**
   * 启动剔除循环
   */
  startCullingLoop() {
    if (this.cullingLoop) {
      return
    }

    this.cullingLoop = setInterval(() => {
      if (!this.renderState.isPaused) {
        this.performCulling()
      }
    }, this.options.cullingInterval)
  }

  /**
   * 停止剔除循环
   */
  stopCullingLoop() {
    if (this.cullingLoop) {
      clearInterval(this.cullingLoop)
      this.cullingLoop = null
    }
  }

  /**
   * 更新渲染引擎
   */
  update() {
    const startTime = performance.now()

    try {
      // 处理待处理的更新
      this.processPendingUpdates()

      // 更新活跃图层
      this.updateActiveLayers()

      // 更新统计信息
      this.updateStats()

      this.stats.updateTime = performance.now() - startTime
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  /**
   * 执行视锥剔除
   * @returns {number} 被剔除的实体数量
   */
  performCulling() {
    const frustum = this.camera.frustum
    const cameraPosition = this.camera.position
    let culledCount = 0

    // 对所有活跃图层执行剔除
    this.activeLayerIds.forEach((layerId) => {
      const layer = this.layers.get(layerId)
      if (layer && typeof layer.performCulling === 'function') {
        const layerCulledCount = layer.performCulling(frustum, cameraPosition)
        if (typeof layerCulledCount === 'number') {
          culledCount += layerCulledCount
        }
      }
    })

    this.stats.culledEntities = culledCount
    return culledCount
  }

  /**
   * 处理待处理的更新
   */
  processPendingUpdates() {
    this.pendingUpdates.forEach((updates, layerId) => {
      const layer = this.layers.get(layerId)
      if (layer && updates.length > 0) {
        updates.forEach((update) => {
          try {
            layer.processUpdate(update)
          } catch (error) {
            console.error(`Failed to process update for layer ${layerId}:`, error)
          }
        })
        updates.length = 0 // 清空已处理的更新
      }
    })
  }

  /**
   * 更新活跃图层
   */
  updateActiveLayers() {
    this.activeLayerIds.forEach((layerId) => {
      const layer = this.layers.get(layerId)
      if (layer) {
        layer.update()
      }
    })
  }

  /**
   * 更新图层渲染顺序
   */
  updateLayerRenderOrder() {
    // 根据图层顺序设置渲染优先级
    this.layerOrder.forEach((layerId, index) => {
      const layer = this.layers.get(layerId)
      if (layer) {
        layer.setRenderOrder(index)
      }
    })
  }

  /**
   * 更新图层统计
   * @param {string} layerId - 图层ID
   */
  updateLayerStats(layerId) {
    const layer = this.layers.get(layerId)
    if (!layer) return

    const layerStats = layer.getStats()
    this.stats.layerStats.set(layerId, layerStats)
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    // 计算总统计
    let totalEntities = 0
    let visibleEntities = 0
    let memoryUsage = 0

    this.stats.layerStats.forEach((layerStats) => {
      totalEntities += layerStats.entityCount || 0
      visibleEntities += layerStats.visibleCount || 0
      memoryUsage += layerStats.memoryUsage || 0
    })

    this.stats.totalEntities = totalEntities
    this.stats.visibleEntities = visibleEntities
    this.stats.memoryUsage = memoryUsage

    // 更新渲染调用统计 - 基于实际渲染的实体数量
    if (this.rendererFactory) {
      // 每次更新时增加渲染调用计数
      this.rendererFactory.stats.renderCalls++
      this.rendererFactory.stats.totalEntities = totalEntities
    }

    // 计算FPS
    const currentTime = performance.now()
    if (this.renderState.lastRenderTime > 0) {
      const deltaTime = currentTime - this.renderState.lastRenderTime
      this.stats.fps = Math.round(1000 / deltaTime)
    }
    this.renderState.lastRenderTime = currentTime
    this.renderState.frameCount++

    // 更新内存使用量统计（估算）
    if (this.viewer && this.viewer.scene) {
      // 基于实体数量估算内存使用量
      const estimatedMemoryPerEntity = 1024 // 每个实体大约1KB
      this.stats.memoryUsage = totalEntities * estimatedMemoryPerEntity
      
      // 如果可以获取实际内存信息，使用实际值
      if (performance.memory) {
        this.stats.memoryUsage = performance.memory.usedJSHeapSize
      }
    }
  }

  /**
   * 图层数据变化事件处理
   * @param {string} layerId - 图层ID
   * @param {Object} data - 变化数据
   */
  onLayerDataChanged(layerId, data) {
    // 调度更新
    this.scheduleUpdate('data', layerId, data)

    // 触发图层联动
    this.triggerLayerInteraction(layerId, 'dataChanged', data)
  }

  /**
   * 图层可见性变化事件处理
   * @param {string} layerId - 图层ID
   * @param {boolean} visible - 是否可见
   */
  onLayerVisibilityChanged(layerId, visible) {
    if (visible) {
      this.activeLayerIds.add(layerId)
    } else {
      this.activeLayerIds.delete(layerId)
    }

    // 触发图层联动
    this.triggerLayerInteraction(layerId, 'visibilityChanged', { visible })
  }

  /**
   * 图层销毁事件处理
   * @param {string} layerId - 图层ID
   */
  onLayerDestroyed(layerId) {
    // 清理引用
    this.layers.delete(layerId)
    this.activeLayerIds.delete(layerId)
    this.stats.layerStats.delete(layerId)
    this.pendingUpdates.delete(layerId)

    // 更新图层顺序
    const index = this.layerOrder.indexOf(layerId)
    if (index > -1) {
      this.layerOrder.splice(index, 1)
    }
  }

  /**
   * 触发图层联动
   * @param {string} sourceLayerId - 源图层ID
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  triggerLayerInteraction(sourceLayerId, event, data) {
    // 通知其他图层
    this.layers.forEach((layer, layerId) => {
      if (layerId !== sourceLayerId) {
        layer.onLayerInteraction(sourceLayerId, event, data)
      }
    })

    this.emit('layerInteraction', { sourceLayerId, event, data })
  }

  /**
   * 调度更新
   * @param {string} type - 更新类型
   * @param {string} layerId - 图层ID
   * @param {Object} data - 更新数据
   */
  scheduleUpdate(type, layerId, data) {
    if (!this.pendingUpdates.has(layerId)) {
      this.pendingUpdates.set(layerId, [])
    }

    this.pendingUpdates.get(layerId).push({
      type,
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * 渲染前事件处理
   */
  onPreRender() {
    this.renderState.isRendering = true
    const startTime = performance.now()

    // 更新实体管理器
    this.entityManager.preRender()

    this.stats.renderTime = performance.now() - startTime
  }

  /**
   * 渲染后事件处理
   */
  onPostRender() {
    this.renderState.isRendering = false

    // 更新实体管理器
    this.entityManager.postRender()
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    // 安全地获取子组件统计信息，避免循环引用
    const entityManagerStats = this.entityManager ? this.getSafeStats(this.entityManager.getStats()) : {}
    const timeManagerStats = this.timeManager ? this.getSafeStats(this.timeManager.getStats()) : {}
    const rendererFactoryStats = this.rendererFactory ? this.getSafeStats(this.rendererFactory.getStats()) : {}

    return {
      ...this.stats,
      layerCount: this.layers.size,
      activeLayerCount: this.activeLayerIds.size,
      renderState: { ...this.renderState },
      entityManagerStats,
      timeManagerStats,
      rendererFactoryStats,
    }
  }

  /**
   * 安全地获取统计信息，移除循环引用
   * @param {Object} stats - 原始统计信息
   * @returns {Object} 安全的统计信息
   */
  getSafeStats(stats) {
    if (!stats || typeof stats !== 'object') {
      return {}
    }

    const safeStats = {}
    
    // 只复制基本数据类型和简单对象
    for (const [key, value] of Object.entries(stats)) {
      if (value === null || value === undefined) {
        safeStats[key] = value
      } else if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        safeStats[key] = value
      } else if (Array.isArray(value)) {
        // 只复制基本类型数组
        safeStats[key] = value.filter(item => 
          typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean'
        )
      } else if (typeof value === 'object' && value.constructor === Object) {
        // 递归处理简单对象，但限制深度
        safeStats[key] = this.getSafeStatsRecursive(value, 1)
      }
      // 忽略函数、Cesium对象等复杂类型
    }

    return safeStats
  }

  /**
   * 递归安全地获取统计信息
   * @param {Object} obj - 对象
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   * @returns {Object} 安全的对象
   */
  getSafeStatsRecursive(obj, depth, maxDepth = 3) {
    if (depth > maxDepth || !obj || typeof obj !== 'object') {
      return {}
    }

    const safeObj = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        safeObj[key] = value
      } else if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        safeObj[key] = value
      } else if (Array.isArray(value)) {
        safeObj[key] = value.filter(item => 
          typeof item === 'number' || typeof item === 'string' || typeof item === 'boolean'
        )
      } else if (typeof value === 'object' && value.constructor === Object) {
        safeObj[key] = this.getSafeStatsRecursive(value, depth + 1, maxDepth)
      }
    }

    return safeObj
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    const stats = this.getStats()

    return {
      overview: {
        fps: stats.fps,
        totalEntities: stats.totalEntities,
        visibleEntities: stats.visibleEntities,
        memoryUsage: `${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      },
      layers: Array.from(this.stats.layerStats.entries()).map(([layerId, layerStats]) => ({
        layerId,
        ...layerStats,
      })),
      performance: {
        renderTime: `${stats.renderTime.toFixed(2)} ms`,
        updateTime: `${stats.updateTime.toFixed(2)} ms`,
        culledEntities: stats.culledEntities,
        batchedEntities: stats.batchedEntities,
        instancedEntities: stats.instancedEntities,
      },
      recommendations: this.generatePerformanceRecommendations(stats),
    }
  }

  /**
   * 生成性能建议
   * @param {Object} stats - 统计信息
   * @returns {Array} 建议数组
   */
  generatePerformanceRecommendations(stats) {
    const recommendations = []

    if (stats.fps < 30) {
      recommendations.push('FPS较低，建议启用LOD或减少实体数量')
    }

    if (stats.culledEntities / stats.totalEntities < 0.3) {
      recommendations.push('视锥剔除效果不佳，建议检查相机设置')
    }

    if (stats.batchedEntities / stats.totalEntities < 0.5) {
      recommendations.push('批处理使用率较低，建议启用批处理优化')
    }

    if (stats.memoryUsage > 500 * 1024 * 1024) {
      // 500MB
      recommendations.push('内存使用量较高，建议启用数据流或清理未使用数据')
    }

    return recommendations
  }

  /**
   * 导出配置
   * @returns {Object} 配置对象
   */
  exportConfig() {
    return {
      options: this.options,
      layers: Array.from(this.layers.entries()).map(([layerId, layer]) => ({
        layerId,
        config: layer.exportConfig(),
      })),
      layerOrder: this.layerOrder,
      timeRange: this.timeManager.getTimeRange(),
      currentTime: this.timeManager.getCurrentTime(),
    }
  }

  /**
   * 导入配置
   * @param {Object} config - 配置对象
   */
  async importConfig(config) {
    try {
      // 清空现有图层
      this.layers.forEach((layer, layerId) => {
        this.removeLayer(layerId)
      })

      // 应用选项
      this.options = { ...this.options, ...config.options }

      // 重建图层
      for (const layerConfig of config.layers) {
        const layer = this.createLayer(layerConfig.layerId)
        await layer.importConfig(layerConfig.config)
      }

      // 设置图层顺序
      if (config.layerOrder) {
        this.setLayerOrder(config.layerOrder)
      }

      // 设置时间范围
      if (config.timeRange) {
        this.setTimeRange(config.timeRange)
      }

      // 设置当前时间
      if (config.currentTime) {
        this.setCurrentTime(config.currentTime)
      }

      this.emit('configImported', { config })
    } catch (error) {
      console.error('Failed to import config:', error)
      throw error
    }
  }

  /**
   * 事件发射
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in render engine event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理器
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理器
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 设置性能预设
   * @param {string} preset - 性能预设 ('high-performance', 'balanced', 'high-quality')
   */
  setPerformancePreset(preset) {
    const presets = {
      'high-performance': {
        enableLOD: true,
        enableCulling: true,
        enableBatching: true,
        enableInstancing: true,
        enableCaching: true,
        maxEntitiesPerLayer: 50000,
        updateInterval: 16,
        cullingInterval: 50,
      },
      balanced: {
        enableLOD: true,
        enableCulling: true,
        enableBatching: true,
        enableInstancing: false,
        enableCaching: true,
        maxEntitiesPerLayer: 20000,
        updateInterval: 16,
        cullingInterval: 100,
      },
      'high-quality': {
        enableLOD: false,
        enableCulling: true,
        enableBatching: false,
        enableInstancing: false,
        enableCaching: true,
        maxEntitiesPerLayer: 10000,
        updateInterval: 32,
        cullingInterval: 200,
      },
    }

    const config = presets[preset]
    if (!config) {
      console.error(`未知的性能预设: ${preset}. 可用预设: ${Object.keys(presets).join(', ')}`)
      return
    }

    // 更新选项
    this.options = { ...this.options, ...config }

    // 应用到所有图层
    this.layers.forEach((layer) => {
      if (typeof layer.setMaxEntities === 'function') {
        layer.setMaxEntities(config.maxEntitiesPerLayer)
      }
      if (typeof layer.setLODEnabled === 'function') {
        layer.setLODEnabled(config.enableLOD)
      }
    })

    // 重新启动剔除循环以应用新的间隔
    if (this.cullingLoop) {
      this.stopCullingLoop()
      if (this.options.enableCulling) {
        this.startCullingLoop()
      }
    }

    console.log(`应用性能预设: ${preset}`, config)
    this.emit('performancePresetChanged', { preset, config })
  }

  /**
   * 获取当前性能预设
   * @returns {string|null} 当前性能预设名称
   */
  getCurrentPerformancePreset() {
    // 根据当前配置推断预设
    const opts = this.options

    if (
      opts.enableLOD &&
      opts.enableBatching &&
      opts.enableInstancing &&
      opts.maxEntitiesPerLayer >= 50000
    ) {
      return 'high-performance'
    } else if (
      opts.enableLOD &&
      opts.enableBatching &&
      !opts.enableInstancing &&
      opts.maxEntitiesPerLayer >= 20000
    ) {
      return 'balanced'
    } else if (
      !opts.enableLOD &&
      !opts.enableBatching &&
      !opts.enableInstancing &&
      opts.maxEntitiesPerLayer <= 10000
    ) {
      return 'high-quality'
    }

    return null // 自定义配置
  }

  /**
   * 销毁渲染引擎
   */
  destroy() {
    console.log('Destroying RenderEngine...')

    // 停止更新循环
    this.stopUpdateLoop()
    this.stopCullingLoop()

    // 销毁所有图层
    this.layers.forEach((layer, layerId) => {
      layer.destroy()
    })

    // 销毁核心组件
    if (this.entityManager) {
      this.entityManager.destroy()
    }

    if (this.timeManager) {
      this.timeManager.destroy()
    }

    if (this.rendererFactory) {
      this.rendererFactory.destroy()
    }

    if (this.dataAdapter) {
      this.dataAdapter.destroy()
    }

    // 清理缓存
    this.layers.clear()
    this.layerOrder.length = 0
    this.activeLayerIds.clear()
    this.dataStreams.clear()
    this.dataBuffer.clear()
    this.pendingUpdates.clear()
    this.eventHandlers.clear()

    console.log('RenderEngine destroyed')
  }
}

export default RenderEngine
