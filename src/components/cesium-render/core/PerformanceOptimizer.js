/**
 * 性能优化器 - 负责渲染性能监控、LOD管理、视锥剔除和内存优化
 * 支持动态LOD、智能剔除、内存管理和性能分析
 */

class PerformanceOptimizer {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.scene = viewer.scene
    this.camera = viewer.camera

    // 配置选项
    this.options = {
      enableLOD: true,
      enableFrustumCulling: true,
      enableOcclusion: false,
      maxEntitiesPerFrame: 1000,
      lodDistances: [1000, 5000, 20000, 100000], // LOD距离阈值
      cullingDistance: 200000, // 剔除距离
      memoryThreshold: 500 * 1024 * 1024, // 内存阈值 (500MB)
      performanceTarget: 60, // 目标FPS
      adaptiveQuality: true,
      debugMode: false,
      ...options,
    }

    // 性能监控
    this.performance = {
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      entityCount: 0,
      visibleEntityCount: 0,
      culledEntityCount: 0,
      lodLevel: 0,
      lastFrameTime: 0,
      frameCount: 0,
      totalFrameTime: 0,
    }

    // LOD管理
    this.lodManager = {
      currentLevel: 0,
      distances: this.options.lodDistances,
      entityLOD: new Map(), // entityId -> lodLevel
      lodConfigs: new Map(), // lodLevel -> config
      adaptiveEnabled: true,
    }

    // 视锥剔除
    this.frustumCuller = {
      enabled: this.options.enableFrustumCulling,
      frustum: null,
      culledEntities: new Set(),
      visibleEntities: new Set(),
      lastCameraPosition: null,
      lastCameraDirection: null,
      updateThreshold: 0.1, // 相机变化阈值
    }

    // 内存管理
    this.memoryManager = {
      threshold: this.options.memoryThreshold,
      currentUsage: 0,
      textureCache: new Map(),
      geometryCache: new Map(),
      materialCache: new Map(),
      cleanupQueue: [],
      lastCleanupTime: 0,
      cleanupInterval: 30000, // 30秒
    }

    // 渲染队列
    this.renderQueue = {
      high: [], // 高优先级
      medium: [], // 中优先级
      low: [], // 低优先级
      background: [], // 后台渲染
      maxPerFrame: this.options.maxEntitiesPerFrame,
    }

    // 自适应质量
    this.adaptiveQuality = {
      enabled: this.options.adaptiveQuality,
      currentQuality: 1.0,
      targetFPS: this.options.performanceTarget,
      qualityLevels: [0.25, 0.5, 0.75, 1.0],
      adjustmentHistory: [],
      lastAdjustment: 0,
      adjustmentInterval: 2000, // 2秒
    }

    // 事件处理器
    this.eventHandlers = new Map()

    // 调试信息
    this.debugInfo = {
      enabled: this.options.debugMode,
      overlay: null,
      stats: new Map(),
    }

    this.init()
  }

  /**
   * 初始化性能优化器
   */
  init() {
    // 初始化LOD配置
    this.initLODConfigs()

    // 监听相机变化
    this.camera.changed.addEventListener(this.onCameraChanged.bind(this))

    // 启动性能监控
    this.startPerformanceMonitoring()

    // 启动渲染循环
    this.startRenderLoop()

    // 初始化调试界面
    if (this.debugInfo.enabled) {
      this.initDebugOverlay()
    }
  }

  /**
   * 初始化LOD配置
   */
  initLODConfigs() {
    // LOD 0 - 最高质量（近距离）
    this.lodManager.lodConfigs.set(0, {
      maxDistance: this.lodManager.distances[0],
      entityScale: 1.0,
      textureQuality: 1.0,
      geometryDetail: 1.0,
      enableShadows: true,
      enableReflections: true,
      maxEntities: 500,
    })

    // LOD 1 - 高质量（中近距离）
    this.lodManager.lodConfigs.set(1, {
      maxDistance: this.lodManager.distances[1],
      entityScale: 0.8,
      textureQuality: 0.8,
      geometryDetail: 0.8,
      enableShadows: true,
      enableReflections: false,
      maxEntities: 1000,
    })

    // LOD 2 - 中等质量（中距离）
    this.lodManager.lodConfigs.set(2, {
      maxDistance: this.lodManager.distances[2],
      entityScale: 0.6,
      textureQuality: 0.6,
      geometryDetail: 0.6,
      enableShadows: false,
      enableReflections: false,
      maxEntities: 2000,
    })

    // LOD 3 - 低质量（远距离）
    this.lodManager.lodConfigs.set(3, {
      maxDistance: this.lodManager.distances[3],
      entityScale: 0.4,
      textureQuality: 0.4,
      geometryDetail: 0.4,
      enableShadows: false,
      enableReflections: false,
      maxEntities: 5000,
    })

    // LOD 4 - 最低质量（极远距离）
    this.lodManager.lodConfigs.set(4, {
      maxDistance: Infinity,
      entityScale: 0.2,
      textureQuality: 0.2,
      geometryDetail: 0.2,
      enableShadows: false,
      enableReflections: false,
      maxEntities: 10000,
    })
  }

  /**
   * 更新性能优化
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   */
  update(entities, options = {}) {
    const startTime = performance.now()

    try {
      // 更新性能统计
      this.updatePerformanceStats()

      // 更新LOD
      if (this.options.enableLOD) {
        this.updateLOD(entities)
      }

      // 视锥剔除
      if (this.options.enableFrustumCulling) {
        this.updateFrustumCulling(entities)
      }

      // 更新渲染队列
      this.updateRenderQueue(entities)

      // 自适应质量调整
      if (this.adaptiveQuality.enabled) {
        this.updateAdaptiveQuality()
      }

      // 内存管理
      this.updateMemoryManagement()

      // 更新调试信息
      if (this.debugInfo.enabled) {
        this.updateDebugInfo()
      }
    } finally {
      this.performance.updateTime = performance.now() - startTime
    }
  }

  /**
   * 更新LOD
   * @param {Array} entities - 实体数组
   */
  updateLOD(entities) {
    const cameraPosition = this.camera.position

    entities.forEach((entity) => {
      if (!entity.position) return

      // 计算距离
      const entityPosition = Cesium.Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.height || 0,
      )

      const distance = Cesium.Cartesian3.distance(cameraPosition, entityPosition)

      // 确定LOD级别
      let lodLevel = this.lodManager.distances.length
      for (let i = 0; i < this.lodManager.distances.length; i++) {
        if (distance <= this.lodManager.distances[i]) {
          lodLevel = i
          break
        }
      }

      // 更新实体LOD
      const currentLOD = this.lodManager.entityLOD.get(entity.id)
      if (currentLOD !== lodLevel) {
        this.lodManager.entityLOD.set(entity.id, lodLevel)
        this.applyLOD(entity, lodLevel)
      }
    })
  }

  /**
   * 应用LOD设置
   * @param {Object} entity - 实体对象
   * @param {number} lodLevel - LOD级别
   */
  applyLOD(entity, lodLevel) {
    const config = this.lodManager.lodConfigs.get(lodLevel)
    if (!config) return

    // 应用缩放
    if (entity.cesiumEntity && entity.cesiumEntity.billboard) {
      entity.cesiumEntity.billboard.scale = config.entityScale
    }

    if (entity.cesiumEntity && entity.cesiumEntity.model) {
      entity.cesiumEntity.model.scale = config.entityScale
    }

    // 应用材质质量
    if (entity.cesiumEntity && entity.cesiumEntity.polygon) {
      // 根据LOD调整多边形细节
      const material = entity.cesiumEntity.polygon.material
      if (material && material.uniforms) {
        material.uniforms.quality = config.textureQuality
      }
    }

    // 更新实体LOD信息
    entity._lodLevel = lodLevel
    entity._lodConfig = config

    this.emit('lodChanged', { entity, lodLevel, config })
  }

  /**
   * 更新视锥剔除
   * @param {Array} entities - 实体数组
   */
  updateFrustumCulling(entities) {
    // 检查相机是否有显著变化
    if (!this.shouldUpdateFrustumCulling()) {
      return
    }

    // 获取当前视锥
    this.frustumCuller.frustum = this.camera.frustum
    const cullingVolume = this.frustumCuller.frustum.computeCullingVolume(
      this.camera.position,
      this.camera.direction,
      this.camera.up,
    )

    // 清空之前的结果
    this.frustumCuller.culledEntities.clear()
    this.frustumCuller.visibleEntities.clear()

    entities.forEach((entity) => {
      if (!entity.position) return

      // 创建包围球
      const entityPosition = Cesium.Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.height || 0,
      )

      const boundingSphere = new Cesium.BoundingSphere(entityPosition, entity.radius || 10)

      // 视锥剔除测试
      const visibility = cullingVolume.computeVisibility(boundingSphere)

      if (visibility === Cesium.Intersect.OUTSIDE) {
        this.frustumCuller.culledEntities.add(entity.id)
        entity._visible = false
      } else {
        this.frustumCuller.visibleEntities.add(entity.id)
        entity._visible = true
      }
    })

    // 更新相机状态
    this.frustumCuller.lastCameraPosition = this.camera.position.clone()
    this.frustumCuller.lastCameraDirection = this.camera.direction.clone()

    // 更新统计
    this.performance.visibleEntityCount = this.frustumCuller.visibleEntities.size
    this.performance.culledEntityCount = this.frustumCuller.culledEntities.size
  }

  /**
   * 检查是否需要更新视锥剔除
   * @returns {boolean} 是否需要更新
   */
  shouldUpdateFrustumCulling() {
    if (!this.frustumCuller.lastCameraPosition || !this.frustumCuller.lastCameraDirection) {
      return true
    }

    const positionChange = Cesium.Cartesian3.distance(
      this.camera.position,
      this.frustumCuller.lastCameraPosition,
    )

    const directionChange =
      1 - Cesium.Cartesian3.dot(this.camera.direction, this.frustumCuller.lastCameraDirection)

    return (
      positionChange > this.frustumCuller.updateThreshold ||
      directionChange > this.frustumCuller.updateThreshold
    )
  }

  /**
   * 更新渲染队列
   * @param {Array} entities - 实体数组
   */
  updateRenderQueue(entities) {
    // 清空队列
    this.renderQueue.high = []
    this.renderQueue.medium = []
    this.renderQueue.low = []
    this.renderQueue.background = []

    const cameraPosition = this.camera.position

    entities.forEach((entity) => {
      if (!entity._visible) return

      // 计算优先级
      const priority = this.calculateRenderPriority(entity, cameraPosition)

      // 分配到对应队列
      if (priority >= 0.8) {
        this.renderQueue.high.push(entity)
      } else if (priority >= 0.6) {
        this.renderQueue.medium.push(entity)
      } else if (priority >= 0.3) {
        this.renderQueue.low.push(entity)
      } else {
        this.renderQueue.background.push(entity)
      }
    })

    // 排序队列
    this.sortRenderQueues()
  }

  /**
   * 计算渲染优先级
   * @param {Object} entity - 实体对象
   * @param {Cesium.Cartesian3} cameraPosition - 相机位置
   * @returns {number} 优先级 (0-1)
   */
  calculateRenderPriority(entity, cameraPosition) {
    let priority = 0.5 // 基础优先级

    // 距离因子
    if (entity.position) {
      const entityPosition = Cesium.Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.height || 0,
      )

      const distance = Cesium.Cartesian3.distance(cameraPosition, entityPosition)
      const distanceFactor = Math.max(0, 1 - distance / this.options.cullingDistance)
      priority += distanceFactor * 0.3
    }

    // 重要性因子
    if (entity.priority !== undefined) {
      priority += entity.priority * 0.2
    }

    // 动态因子（移动的实体优先级更高）
    if (entity.velocity && entity.velocity > 0) {
      priority += 0.1
    }

    // 用户交互因子
    if (entity._selected || entity._highlighted) {
      priority += 0.2
    }

    return Math.min(1, Math.max(0, priority))
  }

  /**
   * 排序渲染队列
   */
  sortRenderQueues() {
    const sortFn = (a, b) => {
      // 按距离排序（近的优先）
      const distanceA = this.getEntityDistance(a)
      const distanceB = this.getEntityDistance(b)
      return distanceA - distanceB
    }

    this.renderQueue.high.sort(sortFn)
    this.renderQueue.medium.sort(sortFn)
    this.renderQueue.low.sort(sortFn)
    this.renderQueue.background.sort(sortFn)
  }

  /**
   * 获取实体距离
   * @param {Object} entity - 实体对象
   * @returns {number} 距离
   */
  getEntityDistance(entity) {
    if (!entity.position) return Infinity

    const entityPosition = Cesium.Cartesian3.fromDegrees(
      entity.position.longitude,
      entity.position.latitude,
      entity.position.height || 0,
    )

    return Cesium.Cartesian3.distance(this.camera.position, entityPosition)
  }

  /**
   * 获取当前帧应渲染的实体
   * @returns {Array} 实体数组
   */
  getEntitiesForCurrentFrame() {
    const entities = []
    const maxPerFrame = this.renderQueue.maxPerFrame

    // 高优先级实体全部渲染
    entities.push(...this.renderQueue.high)

    // 根据剩余预算分配中低优先级实体
    const remaining = maxPerFrame - entities.length
    if (remaining > 0) {
      const mediumCount = Math.min(remaining * 0.6, this.renderQueue.medium.length)
      entities.push(...this.renderQueue.medium.slice(0, mediumCount))

      const lowCount = Math.min(remaining - mediumCount, this.renderQueue.low.length)
      entities.push(...this.renderQueue.low.slice(0, lowCount))
    }

    return entities
  }

  /**
   * 更新自适应质量
   */
  updateAdaptiveQuality() {
    const now = Date.now()
    if (now - this.adaptiveQuality.lastAdjustment < this.adaptiveQuality.adjustmentInterval) {
      return
    }

    const currentFPS = this.performance.fps
    const targetFPS = this.adaptiveQuality.targetFPS
    const currentQuality = this.adaptiveQuality.currentQuality

    let newQuality = currentQuality

    // FPS过低，降低质量
    if (currentFPS < targetFPS * 0.8) {
      const qualityIndex = this.adaptiveQuality.qualityLevels.indexOf(currentQuality)
      if (qualityIndex > 0) {
        newQuality = this.adaptiveQuality.qualityLevels[qualityIndex - 1]
      }
    }
    // FPS过高，提高质量
    else if (currentFPS > targetFPS * 1.1) {
      const qualityIndex = this.adaptiveQuality.qualityLevels.indexOf(currentQuality)
      if (qualityIndex < this.adaptiveQuality.qualityLevels.length - 1) {
        newQuality = this.adaptiveQuality.qualityLevels[qualityIndex + 1]
      }
    }

    if (newQuality !== currentQuality) {
      this.adaptiveQuality.currentQuality = newQuality
      this.applyQualitySettings(newQuality)

      // 记录调整历史
      this.adaptiveQuality.adjustmentHistory.push({
        time: now,
        fps: currentFPS,
        oldQuality: currentQuality,
        newQuality: newQuality,
      })

      // 限制历史记录长度
      if (this.adaptiveQuality.adjustmentHistory.length > 100) {
        this.adaptiveQuality.adjustmentHistory.shift()
      }

      this.emit('qualityChanged', { oldQuality: currentQuality, newQuality })
    }

    this.adaptiveQuality.lastAdjustment = now
  }

  /**
   * 应用质量设置
   * @param {number} quality - 质量级别 (0-1)
   */
  applyQualitySettings(quality) {
    // 调整渲染分辨率
    const resolutionScale = Math.max(0.25, quality)
    this.scene.resolutionScale = resolutionScale

    // 调整最大实体数量
    this.renderQueue.maxPerFrame = Math.floor(this.options.maxEntitiesPerFrame * quality)

    // 调整LOD距离
    const lodScale = 2 - quality // 质量越低，LOD切换距离越近
    this.lodManager.distances = this.options.lodDistances.map((d) => d / lodScale)

    // 调整阴影和后处理
    this.scene.shadowMap.enabled = quality > 0.5

    if (this.scene.postProcessStages) {
      this.scene.postProcessStages.fxaa.enabled = quality > 0.3
    }
  }

  /**
   * 更新内存管理
   */
  updateMemoryManagement() {
    const now = Date.now()
    if (now - this.memoryManager.lastCleanupTime < this.memoryManager.cleanupInterval) {
      return
    }

    // 估算内存使用
    this.estimateMemoryUsage()

    // 如果超过阈值，执行清理
    if (this.memoryManager.currentUsage > this.memoryManager.threshold) {
      this.performMemoryCleanup()
    }

    this.memoryManager.lastCleanupTime = now
  }

  /**
   * 估算内存使用
   */
  estimateMemoryUsage() {
    let usage = 0

    // 纹理缓存
    this.memoryManager.textureCache.forEach((texture) => {
      if (texture.width && texture.height) {
        usage += texture.width * texture.height * 4 // RGBA
      }
    })

    // 几何体缓存
    this.memoryManager.geometryCache.forEach((geometry) => {
      if (geometry.vertices) {
        usage += geometry.vertices.length * 4 // float32
      }
      if (geometry.indices) {
        usage += geometry.indices.length * 2 // uint16
      }
    })

    // 材质缓存
    this.memoryManager.materialCache.forEach((material) => {
      usage += 1024 // 估算每个材质1KB
    })

    this.memoryManager.currentUsage = usage
    this.performance.memoryUsage = usage
  }

  /**
   * 执行内存清理
   */
  performMemoryCleanup() {
    const cleanupCount = Math.min(10, this.memoryManager.cleanupQueue.length)

    for (let i = 0; i < cleanupCount; i++) {
      const item = this.memoryManager.cleanupQueue.shift()
      if (item && item.destroy) {
        try {
          item.destroy()
        } catch (error) {
          console.warn('Failed to cleanup memory item:', error)
        }
      }
    }

    // 清理过期缓存
    this.cleanupExpiredCache()

    this.emit('memoryCleanup', {
      cleanedItems: cleanupCount,
      currentUsage: this.memoryManager.currentUsage,
    })
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now()
    const maxAge = 300000 // 5分钟

    // 清理纹理缓存
    for (const [key, texture] of this.memoryManager.textureCache.entries()) {
      if (now - texture.lastUsed > maxAge) {
        if (texture.destroy) {
          texture.destroy()
        }
        this.memoryManager.textureCache.delete(key)
      }
    }

    // 清理几何体缓存
    for (const [key, geometry] of this.memoryManager.geometryCache.entries()) {
      if (now - geometry.lastUsed > maxAge) {
        if (geometry.destroy) {
          geometry.destroy()
        }
        this.memoryManager.geometryCache.delete(key)
      }
    }

    // 清理材质缓存
    for (const [key, material] of this.memoryManager.materialCache.entries()) {
      if (now - material.lastUsed > maxAge) {
        if (material.destroy) {
          material.destroy()
        }
        this.memoryManager.materialCache.delete(key)
      }
    }
  }

  /**
   * 相机变化处理
   */
  onCameraChanged() {
    // 触发LOD更新
    if (this.lodManager.adaptiveEnabled) {
      this.emit('cameraChanged', {
        position: this.camera.position,
        direction: this.camera.direction,
      })
    }
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    let lastTime = performance.now()
    let frameCount = 0
    let totalFrameTime = 0

    const monitor = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime

      frameCount++
      totalFrameTime += deltaTime

      // 每秒更新一次FPS
      if (totalFrameTime >= 1000) {
        this.performance.fps = Math.round((frameCount * 1000) / totalFrameTime)
        this.performance.frameTime = totalFrameTime / frameCount

        frameCount = 0
        totalFrameTime = 0
      }

      lastTime = currentTime
      requestAnimationFrame(monitor)
    }

    monitor()
  }

  /**
   * 启动渲染循环
   */
  startRenderLoop() {
    const render = () => {
      const startTime = performance.now()

      // 这里可以添加自定义渲染逻辑

      this.performance.renderTime = performance.now() - startTime
      requestAnimationFrame(render)
    }

    render()
  }

  /**
   * 更新性能统计
   */
  updatePerformanceStats() {
    this.performance.entityCount = this.scene.primitives.length
    this.performance.lodLevel = this.lodManager.currentLevel
  }

  /**
   * 初始化调试界面
   */
  initDebugOverlay() {
    if (typeof document === 'undefined') return

    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      z-index: 10000;
      min-width: 200px;
    `

    document.body.appendChild(overlay)
    this.debugInfo.overlay = overlay
  }

  /**
   * 更新调试信息
   */
  updateDebugInfo() {
    if (!this.debugInfo.overlay) return

    const stats = [
      `FPS: ${this.performance.fps}`,
      `Frame Time: ${this.performance.frameTime.toFixed(2)}ms`,
      `Render Time: ${this.performance.renderTime.toFixed(2)}ms`,
      `Update Time: ${this.performance.updateTime.toFixed(2)}ms`,
      `Memory: ${(this.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `Entities: ${this.performance.entityCount}`,
      `Visible: ${this.performance.visibleEntityCount}`,
      `Culled: ${this.performance.culledEntityCount}`,
      `LOD Level: ${this.performance.lodLevel}`,
      `Quality: ${(this.adaptiveQuality.currentQuality * 100).toFixed(0)}%`,
      `High Queue: ${this.renderQueue.high.length}`,
      `Medium Queue: ${this.renderQueue.medium.length}`,
      `Low Queue: ${this.renderQueue.low.length}`,
    ]

    this.debugInfo.overlay.innerHTML = stats.join('<br>')
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      lodManager: {
        currentLevel: this.lodManager.currentLevel,
        entityLODCount: this.lodManager.entityLOD.size,
      },
      frustumCuller: {
        visibleCount: this.frustumCuller.visibleEntities.size,
        culledCount: this.frustumCuller.culledEntities.size,
      },
      renderQueue: {
        high: this.renderQueue.high.length,
        medium: this.renderQueue.medium.length,
        low: this.renderQueue.low.length,
        background: this.renderQueue.background.length,
      },
      adaptiveQuality: {
        currentQuality: this.adaptiveQuality.currentQuality,
        adjustmentCount: this.adaptiveQuality.adjustmentHistory.length,
      },
      memoryManager: {
        currentUsage: this.memoryManager.currentUsage,
        cacheSize: {
          textures: this.memoryManager.textureCache.size,
          geometries: this.memoryManager.geometryCache.size,
          materials: this.memoryManager.materialCache.size,
        },
      },
    }
  }

  /**
   * 设置LOD距离
   * @param {Array} distances - 距离数组
   */
  setLODDistances(distances) {
    this.lodManager.distances = [...distances]
    this.options.lodDistances = [...distances]
    this.initLODConfigs()
  }

  /**
   * 设置性能目标
   * @param {number} targetFPS - 目标FPS
   */
  setPerformanceTarget(targetFPS) {
    this.adaptiveQuality.targetFPS = targetFPS
    this.options.performanceTarget = targetFPS
  }

  /**
   * 启用/禁用功能
   * @param {string} feature - 功能名称
   * @param {boolean} enabled - 是否启用
   */
  setFeatureEnabled(feature, enabled) {
    switch (feature) {
      case 'lod':
        this.options.enableLOD = enabled
        break
      case 'frustumCulling':
        this.options.enableFrustumCulling = enabled
        this.frustumCuller.enabled = enabled
        break
      case 'adaptiveQuality':
        this.adaptiveQuality.enabled = enabled
        break
      case 'debug':
        this.debugInfo.enabled = enabled
        if (enabled && !this.debugInfo.overlay) {
          this.initDebugOverlay()
        } else if (!enabled && this.debugInfo.overlay) {
          this.debugInfo.overlay.remove()
          this.debugInfo.overlay = null
        }
        break
    }
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
          console.error('Performance optimizer event handler error:', error)
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
   * 销毁性能优化器
   */
  destroy() {
    // 移除相机监听
    this.camera.changed.removeEventListener(this.onCameraChanged)

    // 清理缓存
    this.memoryManager.textureCache.clear()
    this.memoryManager.geometryCache.clear()
    this.memoryManager.materialCache.clear()

    // 清理调试界面
    if (this.debugInfo.overlay) {
      this.debugInfo.overlay.remove()
    }

    // 清理事件处理器
    this.eventHandlers.clear()

    // 清理LOD数据
    this.lodManager.entityLOD.clear()
    this.lodManager.lodConfigs.clear()

    // 清理视锥剔除数据
    this.frustumCuller.culledEntities.clear()
    this.frustumCuller.visibleEntities.clear()
  }
}

export default PerformanceOptimizer
