/**
 * 基础渲染器 - 所有渲染器的基类
 * 提供通用的渲染功能和接口
 */

class BaseRenderer {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.scene = viewer.scene
    this.camera = viewer.camera
    
    // 基础配置
    this.options = {
      enableBatching: true,
      enableInstancing: false,
      enableCulling: true,
      enableLOD: false,
      maxEntities: 10000,
      updateInterval: 16, // ms (60 FPS)
      ...options
    }
    
    // 渲染器状态
    this.enabled = true
    this.visible = true
    this.initialized = false
    
    // 实体管理
    this.entities = new Map() // entityId -> entity
    this.renderQueue = [] // 渲染队列
    this.updateQueue = [] // 更新队列
    
    // 性能管理
    this.performance = {
      lastUpdate: 0,
      frameCount: 0,
      renderTime: 0,
      entityCount: 0,
      visibleCount: 0
    }
    
    // 事件系统
    this.events = {
      entityAdded: [],
      entityRemoved: [],
      entityUpdated: [],
      rendered: [],
      disposed: []
    }
    
    // 批处理管理
    this.batching = {
      enabled: this.options.enableBatching,
      batches: new Map(),
      batchSize: 100,
      pendingEntities: []
    }
    
    // 视锥剔除
    this.culling = {
      enabled: this.options.enableCulling,
      frustum: null,
      lastCameraUpdate: 0,
      culledEntities: new Set()
    }
  }
  
  /**
   * 初始化渲染器
   */
  init() {
    if (this.initialized) return
    
    // 初始化批处理
    this.initBatching()
    
    // 初始化视锥剔除
    this.initCulling()
    
    // 绑定事件
    this.bindEvents()
    
    this.initialized = true
    
    console.log(`${this.constructor.name} initialized`)
  }
  
  /**
   * 初始化批处理
   */
  initBatching() {
    if (!this.batching.enabled) return
    
    this.batching.processor = {
      process: this.processBatch.bind(this),
      interval: setInterval(() => {
        if (this.batching.pendingEntities.length > 0) {
          this.processBatch()
        }
      }, this.options.updateInterval)
    }
  }
  
  /**
   * 初始化视锥剔除
   */
  initCulling() {
    if (!this.culling.enabled) return
    
    this.updateCullingFrustum()
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 相机移动事件
    this.camera.moveEnd.addEventListener(() => {
      if (this.culling.enabled) {
        this.updateCullingFrustum()
      }
    })
    
    // 场景渲染前事件
    this.scene.preRender.addEventListener(() => {
      this.preRender()
    })
    
    // 场景渲染后事件
    this.scene.postRender.addEventListener(() => {
      this.postRender()
    })
  }
  
  /**
   * 添加实体（抽象方法，子类必须实现）
   * @param {Object} entity - 实体数据
   * @param {Object} options - 渲染选项
   */
  async addEntity(entity, options = {}) {
    throw new Error('addEntity method must be implemented by subclass')
  }
  
  /**
   * 更新实体（抽象方法，子类必须实现）
   * @param {string} entityId - 实体ID
   * @param {Object} updates - 更新数据
   */
  updateEntity(entityId, updates) {
    throw new Error('updateEntity method must be implemented by subclass')
  }
  
  /**
   * 移除实体（抽象方法，子类必须实现）
   * @param {string} entityId - 实体ID
   */
  removeEntity(entityId) {
    throw new Error('removeEntity method must be implemented by subclass')
  }
  
  /**
   * 添加实体到管理器
   * @param {Object} entity - 实体数据
   */
  addEntityToManager(entity) {
    this.entities.set(entity.id, entity)
    
    // 添加到批处理队列
    if (this.batching.enabled) {
      this.batching.pendingEntities.push(entity)
    }
    
    // 触发事件
    this.emit('entityAdded', entity)
    
    // 更新性能统计
    this.performance.entityCount++
  }
  
  /**
   * 从管理器移除实体
   * @param {string} entityId - 实体ID
   */
  removeEntityFromManager(entityId) {
    const entity = this.entities.get(entityId)
    if (!entity) return
    
    this.entities.delete(entityId)
    
    // 从渲染队列移除
    this.renderQueue = this.renderQueue.filter(item => item.id !== entityId)
    
    // 从更新队列移除
    this.updateQueue = this.updateQueue.filter(item => item.id !== entityId)
    
    // 从剔除列表移除
    this.culling.culledEntities.delete(entityId)
    
    // 触发事件
    this.emit('entityRemoved', entity)
    
    // 更新性能统计
    this.performance.entityCount--
  }
  
  /**
   * 处理批次
   */
  processBatch() {
    if (this.batching.pendingEntities.length === 0) return
    
    const batchSize = Math.min(this.batching.batchSize, this.batching.pendingEntities.length)
    const batch = this.batching.pendingEntities.splice(0, batchSize)
    
    // 处理批次中的实体
    batch.forEach(entity => {
      this.processEntity(entity)
    })
  }
  
  /**
   * 处理单个实体
   * @param {Object} entity - 实体数据
   */
  processEntity(entity) {
    // 子类可以重写此方法
    console.log(`Processing entity: ${entity.id}`)
  }
  
  /**
   * 更新视锥剔除
   */
  updateCullingFrustum() {
    this.culling.frustum = this.camera.frustum.clone()
    this.culling.lastCameraUpdate = Date.now()
    
    // 重新计算可见实体
    this.updateVisibility()
  }
  
  /**
   * 更新可见性
   */
  updateVisibility() {
    if (!this.culling.enabled) return
    
    let visibleCount = 0
    
    this.entities.forEach((entity, entityId) => {
      const isVisible = this.isEntityVisible(entity)
      
      if (isVisible) {
        this.culling.culledEntities.delete(entityId)
        visibleCount++
      } else {
        this.culling.culledEntities.add(entityId)
      }
    })
    
    this.performance.visibleCount = visibleCount
  }
  
  /**
   * 检查实体是否可见
   * @param {Object} entity - 实体数据
   * @returns {boolean} 是否可见
   */
  isEntityVisible(entity) {
    if (!entity.position) return true
    
    // 简单的距离剔除
    const entityPosition = Cesium.Cartesian3.fromDegrees(
      entity.position.longitude,
      entity.position.latitude,
      entity.position.altitude || 0
    )
    
    const distance = Cesium.Cartesian3.distance(this.camera.position, entityPosition)
    const maxDistance = entity.maxDistance || 100000 // 100km
    
    return distance <= maxDistance
  }
  
  /**
   * 渲染前处理
   */
  preRender() {
    const now = Date.now()
    
    // 检查是否需要更新
    if (now - this.performance.lastUpdate < this.options.updateInterval) {
      return
    }
    
    this.performance.lastUpdate = now
    
    // 更新可见性
    if (this.culling.enabled) {
      this.updateVisibility()
    }
    
    // 处理更新队列
    this.processUpdateQueue()
  }
  
  /**
   * 渲染后处理
   */
  postRender() {
    this.performance.frameCount++
    
    // 触发渲染事件
    this.emit('rendered', {
      frameCount: this.performance.frameCount,
      entityCount: this.performance.entityCount,
      visibleCount: this.performance.visibleCount
    })
  }
  
  /**
   * 处理更新队列
   */
  processUpdateQueue() {
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()
      this.applyUpdate(update)
    }
  }
  
  /**
   * 应用更新
   * @param {Object} update - 更新数据
   */
  applyUpdate(update) {
    const entity = this.entities.get(update.id)
    if (!entity) return
    
    // 合并更新数据
    Object.assign(entity, update.data)
    
    // 触发更新事件
    this.emit('entityUpdated', { entity, updates: update.data })
  }
  
  /**
   * 批量添加实体
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   */
  async addEntities(entities, options = {}) {
    const results = []
    
    for (const entity of entities) {
      try {
        const result = await this.addEntity(entity, options)
        results.push({ success: true, entity, result })
      } catch (error) {
        results.push({ success: false, entity, error })
      }
    }
    
    return results
  }
  
  /**
   * 批量更新实体
   * @param {Array} updates - 更新数组
   */
  updateEntities(updates) {
    updates.forEach(update => {
      this.updateQueue.push(update)
    })
  }
  
  /**
   * 批量移除实体
   * @param {Array} entityIds - 实体ID数组
   */
  removeEntities(entityIds) {
    entityIds.forEach(entityId => {
      this.removeEntity(entityId)
    })
  }
  
  /**
   * 清空所有实体
   */
  clear() {
    const entityIds = Array.from(this.entities.keys())
    this.removeEntities(entityIds)
  }
  
  /**
   * 设置可见性
   * @param {boolean} visible - 是否可见
   */
  setVisible(visible) {
    this.visible = visible
    
    // 更新所有实体的可见性
    this.entities.forEach((entity, entityId) => {
      this.updateEntityVisibility(entityId, visible)
    })
  }
  
  /**
   * 更新实体可见性
   * @param {string} entityId - 实体ID
   * @param {boolean} visible - 是否可见
   */
  updateEntityVisibility(entityId, visible) {
    // 子类可以重写此方法
    const entity = this.entities.get(entityId)
    if (entity) {
      entity.visible = visible
    }
  }
  
  /**
   * 启用/禁用渲染器
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled
    
    if (!enabled) {
      this.setVisible(false)
    }
  }
  
  /**
   * 更新渲染器
   */
  update() {
    if (!this.enabled || !this.initialized) return
    
    // 子类可以重写此方法添加自定义更新逻辑
  }
  
  /**
   * 获取实体
   * @param {string} entityId - 实体ID
   * @returns {Object|null} 实体对象
   */
  getEntity(entityId) {
    return this.entities.get(entityId) || null
  }
  
  /**
   * 获取所有实体
   * @returns {Array} 实体数组
   */
  getAllEntities() {
    return Array.from(this.entities.values())
  }
  
  /**
   * 获取实体数量
   * @returns {number} 实体数量
   */
  getEntityCount() {
    return this.entities.size
  }
  
  /**
   * 获取可见实体数量
   * @returns {number} 可见实体数量
   */
  getVisibleEntityCount() {
    return this.performance.visibleCount
  }
  
  /**
   * 事件发射器
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    const handlers = this.events[event]
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }
  
  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理器
   */
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(handler)
  }
  
  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理器
   */
  off(event, handler) {
    const handlers = this.events[event]
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }
  
  /**
   * 获取性能统计
   * @returns {Object} 性能统计信息
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      type: this.constructor.name,
      timestamp: Date.now()
    }
  }
  
  /**
   * 获取渲染器信息
   * @returns {Object} 渲染器信息
   */
  getInfo() {
    return {
      type: this.constructor.name,
      enabled: this.enabled,
      visible: this.visible,
      initialized: this.initialized,
      entityCount: this.getEntityCount(),
      visibleCount: this.getVisibleEntityCount(),
      options: this.options,
      performance: this.getPerformanceStats()
    }
  }
  
  /**
   * 销毁渲染器
   */
  dispose() {
    // 清空所有实体
    this.clear()
    
    // 清理批处理
    if (this.batching.processor && this.batching.processor.interval) {
      clearInterval(this.batching.processor.interval)
    }
    
    // 清理事件
    Object.keys(this.events).forEach(event => {
      this.events[event].length = 0
    })
    
    // 重置状态
    this.enabled = false
    this.visible = false
    this.initialized = false
    
    // 触发销毁事件
    this.emit('disposed', this)
    
    console.log(`${this.constructor.name} disposed`)
  }
}

export default BaseRenderer