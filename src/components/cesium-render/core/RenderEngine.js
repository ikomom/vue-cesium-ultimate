/**
 * Cesium原生渲染引擎核心类
 * 负责管理大数据渲染、动态更新、实体管理和图层概念
 */

class RenderEngine {
  constructor(viewer) {
    this.viewer = viewer
    this.layers = new Map() // 图层管理
    this.entityPool = new Map() // 实体对象池
    this.renderQueue = [] // 渲染队列
    this.isRendering = false
    this.frameRequestId = null

    // 性能配置
    this.config = {
      maxEntitiesPerFrame: 100, // 每帧最大渲染实体数
      batchSize: 50, // 批处理大小
      enableLOD: true, // 启用LOD
      enableCulling: true, // 启用视锥剔除
      enableInstancing: true, // 启用实例化渲染
    }

    // 时间管理
    this.timeManager = {
      currentTime: null,
      timeRange: { start: null, end: null },
      isPlaying: false,
      speed: 1.0,
    }

    // 事件系统
    this.eventHandlers = new Map()

    this.init()
  }

  /**
   * 初始化渲染引擎
   */
  init() {
    // 绑定时钟事件
    this.viewer.clock.onTick.addEventListener(this.onClockTick.bind(this))

    // 绑定相机事件
    this.viewer.camera.changed.addEventListener(this.onCameraChanged.bind(this))

    // 启动渲染循环
    this.startRenderLoop()
  }

  /**
   * 创建图层
   * @param {string} layerId - 图层ID
   * @param {Object} options - 图层配置
   * @returns {Layer} 图层实例
   */
  createLayer(layerId, options = {}) {
    if (this.layers.has(layerId)) {
      console.warn(`图层 ${layerId} 已存在`)
      return this.layers.get(layerId)
    }

    const layer = new Layer(layerId, this, options)
    this.layers.set(layerId, layer)

    this.emit('layerCreated', { layerId, layer })
    return layer
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
   * 删除图层
   * @param {string} layerId - 图层ID
   */
  removeLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.destroy()
      this.layers.delete(layerId)
      this.emit('layerRemoved', { layerId })
    }
  }

  /**
   * 设置时间范围
   * @param {Object} timeRange - 时间范围 {start, end}
   */
  setTimeRange(timeRange) {
    this.timeManager.timeRange = timeRange

    // 更新所有图层的时间范围
    for (const layer of this.layers.values()) {
      layer.setTimeRange(timeRange)
    }

    this.emit('timeRangeChanged', timeRange)
  }

  /**
   * 设置当前时间
   * @param {Cesium.JulianDate} time - 当前时间
   */
  setCurrentTime(time) {
    this.timeManager.currentTime = time
    this.viewer.clock.currentTime = time

    // 触发时间更新
    this.onTimeUpdate(time)
  }

  /**
   * 时钟tick事件处理
   * @param {Cesium.Clock} clock - 时钟对象
   */
  onClockTick(clock) {
    this.timeManager.currentTime = clock.currentTime
    this.onTimeUpdate(clock.currentTime)
  }

  /**
   * 时间更新处理
   * @param {Cesium.JulianDate} time - 当前时间
   */
  onTimeUpdate(time) {
    // 更新所有图层的时间相关数据
    for (const layer of this.layers.values()) {
      layer.updateTime(time)
    }

    this.emit('timeUpdate', time)
  }

  /**
   * 相机变化事件处理
   */
  onCameraChanged() {
    if (this.config.enableCulling) {
      this.performCulling()
    }

    this.emit('cameraChanged')
  }

  /**
   * 执行视锥剔除
   */
  performCulling() {
    const frustum = this.viewer.camera.frustum
    const cameraPosition = this.viewer.camera.position

    for (const layer of this.layers.values()) {
      layer.performCulling(frustum, cameraPosition)
    }
  }

  /**
   * 启动渲染循环
   */
  startRenderLoop() {
    const renderFrame = () => {
      this.processRenderQueue()
      this.frameRequestId = requestAnimationFrame(renderFrame)
    }

    renderFrame()
  }

  /**
   * 处理渲染队列
   */
  processRenderQueue() {
    if (this.renderQueue.length === 0) return

    const batchSize = Math.min(this.config.maxEntitiesPerFrame, this.renderQueue.length)
    const batch = this.renderQueue.splice(0, batchSize)

    batch.forEach((renderTask) => {
      try {
        renderTask.execute()
      } catch (error) {
        console.error('渲染任务执行失败:', error)
      }
    })
  }

  /**
   * 添加渲染任务到队列
   * @param {RenderTask} task - 渲染任务
   */
  addRenderTask(task) {
    this.renderQueue.push(task)
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
          console.error(`事件处理器执行失败 [${eventName}]:`, error)
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
   * 销毁渲染引擎
   */
  destroy() {
    // 取消渲染循环
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId)
    }

    // 销毁所有图层
    for (const layer of this.layers.values()) {
      layer.destroy()
    }
    this.layers.clear()

    // 清理事件监听
    this.eventHandlers.clear()

    // 清理渲染队列
    this.renderQueue.length = 0

    // 清理实体池
    this.entityPool.clear()
  }
}

export default RenderEngine
