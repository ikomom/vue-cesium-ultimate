/**
 * 模型渲染器 - 负责渲染3D模型实体
 * 支持glTF、3D Tiles、自定义几何体等多种模型格式
 */

import BaseRenderer from './BaseRenderer.js'
import GeometryUtils from '../utils/GeometryUtils.js'
import MaterialUtils from '../utils/MaterialUtils.js'

class ModelRenderer extends BaseRenderer {
  constructor(viewer, options = {}) {
    super(viewer, options)

    this.type = 'model'
    
    // 模型渲染配置
    this.config = {
      enableShadows: true,
      enableLighting: true,
      enableAnimation: true,
      enableLOD: true,
      maxInstances: 1000,
      enableInstancing: true,
      enableBatching: false, // 模型通常不适合批处理
      ...options
    }

    // 模型管理
    this.models = new Map() // entityId -> model
    this.modelCache = new Map() // modelUrl -> cachedModel
    this.instances = new Map() // modelUrl -> instances[]
    this.animations = new Map() // entityId -> animation

    // LOD管理
    this.lodLevels = new Map() // entityId -> lodLevel
    this.lodDistances = [100, 500, 1000, 5000] // LOD切换距离

    // 性能统计
    this.stats = {
      modelsLoaded: 0,
      modelsRendered: 0,
      instancesCreated: 0,
      animationsActive: 0,
      memoryUsage: 0
    }

    this.init()
  }

  /**
   * 初始化模型渲染器
   */
  init() {
    super.init()

    // 初始化模型加载器
    this.initModelLoader()

    // 初始化实例化管理
    this.initInstanceManager()

    // 初始化动画系统
    this.initAnimationSystem()

    // 初始化LOD系统
    this.initLODSystem()
  }

  /**
   * 初始化模型加载器
   */
  initModelLoader() {
    this.modelLoader = {
      supportedFormats: ['.gltf', '.glb', '.dae', '.obj', '.fbx'],
      loadingQueue: [],
      maxConcurrent: 5,
      currentLoading: 0
    }
  }

  /**
   * 初始化实例化管理
   */
  initInstanceManager() {
    this.instanceManager = {
      enabled: this.config.enableInstancing,
      maxInstances: this.config.maxInstances,
      instancedModels: new Map(),
      transforms: new Map()
    }
  }

  /**
   * 初始化动画系统
   */
  initAnimationSystem() {
    this.animationSystem = {
      enabled: this.config.enableAnimation,
      activeAnimations: new Map(),
      animationMixer: null,
      clock: new Cesium.Clock()
    }
  }

  /**
   * 初始化LOD系统
   */
  initLODSystem() {
    this.lodSystem = {
      enabled: this.config.enableLOD,
      levels: this.lodDistances,
      currentLevels: new Map(),
      updateInterval: 100 // ms
    }
  }

  /**
   * 添加模型实体
   * @param {Object} entity - 实体数据
   * @param {Object} options - 渲染选项
   */
  async addEntity(entity, options = {}) {
    try {
      const config = { ...this.config, ...options }
      
      // 验证实体数据
      if (!this.validateEntity(entity)) {
        throw new Error('Invalid model entity data')
      }

      // 加载模型
      const model = await this.loadModel(entity, config)
      
      // 设置模型属性
      this.setupModelProperties(model, entity, config)
      
      // 添加到场景
      this.addToScene(model, entity)
      
      // 缓存模型
      this.models.set(entity.id, model)
      
      // 设置动画
      if (config.enableAnimation && entity.animation) {
        this.setupAnimation(entity.id, entity.animation)
      }
      
      // 设置LOD
      if (config.enableLOD) {
        this.setupLOD(entity.id, entity.position)
      }
      
      // 更新统计
      this.stats.modelsLoaded++
      
      return model
    } catch (error) {
      console.error('Failed to add model entity:', error)
      throw error
    }
  }

  /**
   * 验证实体数据
   * @param {Object} entity - 实体数据
   * @returns {boolean} 验证结果
   */
  validateEntity(entity) {
    return entity && 
           entity.id && 
           entity.position && 
           (entity.modelUrl || entity.geometry)
  }

  /**
   * 加载模型
   * @param {Object} entity - 实体数据
   * @param {Object} config - 配置选项
   * @returns {Promise<Object>} 模型对象
   */
  async loadModel(entity, config) {
    const modelUrl = entity.modelUrl
    
    // 检查缓存
    if (this.modelCache.has(modelUrl)) {
      return this.cloneModel(this.modelCache.get(modelUrl))
    }
    
    // 创建模型
    let model
    
    if (modelUrl) {
      // 从URL加载模型
      model = await this.loadModelFromUrl(modelUrl, config)
    } else if (entity.geometry) {
      // 从几何体创建模型
      model = this.createModelFromGeometry(entity.geometry, config)
    } else {
      throw new Error('No model source specified')
    }
    
    // 缓存模型
    this.modelCache.set(modelUrl || entity.id, model)
    
    return model
  }

  /**
   * 从URL加载模型
   * @param {string} url - 模型URL
   * @param {Object} config - 配置选项
   * @returns {Promise<Object>} 模型对象
   */
  async loadModelFromUrl(url, config) {
    return new Promise((resolve, reject) => {
      const model = this.viewer.scene.primitives.add(
        Cesium.Model.fromGltf({
          url: url,
          show: false, // 初始隐藏
          shadows: config.enableShadows ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          silhouetteColor: Cesium.Color.YELLOW,
          silhouetteSize: 0,
          color: Cesium.Color.WHITE,
          colorBlendMode: Cesium.ColorBlendMode.MIX,
          colorBlendAmount: 0.5,
          scale: 1.0,
          minimumPixelSize: 64,
          maximumScale: 20000,
          incrementallyLoadTextures: true,
          runAnimations: config.enableAnimation,
          clampAnimations: true,
          credit: undefined
        })
      )
      
      model.readyPromise.then(() => {
        resolve(model)
      }).catch(reject)
    })
  }

  /**
   * 从几何体创建模型
   * @param {Object} geometry - 几何体数据
   * @param {Object} config - 配置选项
   * @returns {Object} 模型对象
   */
  createModelFromGeometry(geometry, config) {
    // 创建几何体实例
    const geometryInstance = GeometryUtils.createGeometry(geometry)
    
    // 创建材质
    const material = MaterialUtils.createMaterial(geometry.material || {})
    
    // 创建图元
    const primitive = new Cesium.Primitive({
      geometryInstances: geometryInstance,
      appearance: new Cesium.MaterialAppearance({
        material: material,
        faceForward: true,
        closed: true
      }),
      shadows: config.enableShadows ? Cesium.ShadowMode.ENABLED : Cesium.ShadowMode.DISABLED,
      show: false
    })
    
    this.viewer.scene.primitives.add(primitive)
    
    return primitive
  }

  /**
   * 设置模型属性
   * @param {Object} model - 模型对象
   * @param {Object} entity - 实体数据
   * @param {Object} config - 配置选项
   */
  setupModelProperties(model, entity, config) {
    // 设置位置
    if (entity.position) {
      const position = Cesium.Cartesian3.fromDegrees(
        entity.position.longitude,
        entity.position.latitude,
        entity.position.altitude || 0
      )
      
      const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
      
      // 应用旋转
      if (entity.orientation) {
        const rotation = Cesium.Matrix3.fromHeadingPitchRoll(
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(entity.orientation.heading || 0),
            Cesium.Math.toRadians(entity.orientation.pitch || 0),
            Cesium.Math.toRadians(entity.orientation.roll || 0)
          )
        )
        Cesium.Matrix4.multiplyByMatrix3(modelMatrix, rotation, modelMatrix)
      }
      
      // 应用缩放
      if (entity.scale) {
        const scale = Cesium.Matrix4.fromScale(
          new Cesium.Cartesian3(entity.scale, entity.scale, entity.scale)
        )
        Cesium.Matrix4.multiply(modelMatrix, scale, modelMatrix)
      }
      
      model.modelMatrix = modelMatrix
    }
    
    // 设置颜色
    if (entity.color) {
      model.color = Cesium.Color.fromCssColorString(entity.color)
    }
    
    // 设置透明度
    if (entity.opacity !== undefined) {
      model.color = model.color || Cesium.Color.WHITE.clone()
      model.color.alpha = entity.opacity
    }
    
    // 设置显示状态
    model.show = entity.visible !== false
  }

  /**
   * 添加到场景
   * @param {Object} model - 模型对象
   * @param {Object} entity - 实体数据
   */
  addToScene(model, entity) {
    // 模型已经在创建时添加到场景
    // 这里可以添加额外的场景管理逻辑
    
    // 添加到渲染队列
    this.renderQueue.push({
      id: entity.id,
      model: model,
      entity: entity,
      type: 'model'
    })
  }

  /**
   * 设置动画
   * @param {string} entityId - 实体ID
   * @param {Object} animationConfig - 动画配置
   */
  setupAnimation(entityId, animationConfig) {
    const model = this.models.get(entityId)
    if (!model || !model.activeAnimations) return
    
    const animation = model.activeAnimations.add({
      name: animationConfig.name || 'default',
      startTime: Cesium.JulianDate.now(),
      delay: animationConfig.delay || 0,
      stopTime: animationConfig.duration ? 
        Cesium.JulianDate.addSeconds(Cesium.JulianDate.now(), animationConfig.duration, new Cesium.JulianDate()) : 
        undefined,
      removeOnStop: animationConfig.removeOnStop || false,
      speedup: animationConfig.speed || 1.0,
      reverse: animationConfig.reverse || false,
      loop: animationConfig.loop ? Cesium.ModelAnimationLoop.REPEAT : Cesium.ModelAnimationLoop.NONE
    })
    
    this.animations.set(entityId, animation)
    this.stats.animationsActive++
  }

  /**
   * 设置LOD
   * @param {string} entityId - 实体ID
   * @param {Object} position - 位置信息
   */
  setupLOD(entityId, position) {
    this.lodLevels.set(entityId, {
      position: Cesium.Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.altitude || 0
      ),
      currentLevel: 0,
      lastUpdate: Date.now()
    })
  }

  /**
   * 更新实体
   * @param {string} entityId - 实体ID
   * @param {Object} updates - 更新数据
   */
  updateEntity(entityId, updates) {
    const model = this.models.get(entityId)
    if (!model) return
    
    // 更新位置
    if (updates.position) {
      const position = Cesium.Cartesian3.fromDegrees(
        updates.position.longitude,
        updates.position.latitude,
        updates.position.altitude || 0
      )
      
      const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
      model.modelMatrix = modelMatrix
    }
    
    // 更新颜色
    if (updates.color) {
      model.color = Cesium.Color.fromCssColorString(updates.color)
    }
    
    // 更新显示状态
    if (updates.visible !== undefined) {
      model.show = updates.visible
    }
    
    // 更新动画
    if (updates.animation) {
      this.updateAnimation(entityId, updates.animation)
    }
  }

  /**
   * 更新动画
   * @param {string} entityId - 实体ID
   * @param {Object} animationConfig - 动画配置
   */
  updateAnimation(entityId, animationConfig) {
    const animation = this.animations.get(entityId)
    if (!animation) return
    
    if (animationConfig.speed !== undefined) {
      animation.speedup = animationConfig.speed
    }
    
    if (animationConfig.reverse !== undefined) {
      animation.reverse = animationConfig.reverse
    }
  }

  /**
   * 移除实体
   * @param {string} entityId - 实体ID
   */
  removeEntity(entityId) {
    const model = this.models.get(entityId)
    if (!model) return
    
    // 停止动画
    const animation = this.animations.get(entityId)
    if (animation) {
      animation.stop()
      this.animations.delete(entityId)
      this.stats.animationsActive--
    }
    
    // 从场景移除
    this.viewer.scene.primitives.remove(model)
    
    // 清理缓存
    this.models.delete(entityId)
    this.lodLevels.delete(entityId)
    
    // 从渲染队列移除
    this.renderQueue = this.renderQueue.filter(item => item.id !== entityId)
  }

  /**
   * 更新LOD
   */
  updateLOD() {
    if (!this.lodSystem.enabled) return
    
    const camera = this.viewer.camera
    const cameraPosition = camera.position
    
    this.lodLevels.forEach((lodInfo, entityId) => {
      const distance = Cesium.Cartesian3.distance(cameraPosition, lodInfo.position)
      
      let newLevel = 0
      for (let i = 0; i < this.lodSystem.levels.length; i++) {
        if (distance > this.lodSystem.levels[i]) {
          newLevel = i + 1
        }
      }
      
      if (newLevel !== lodInfo.currentLevel) {
        lodInfo.currentLevel = newLevel
        this.applyLOD(entityId, newLevel)
      }
    })
  }

  /**
   * 应用LOD级别
   * @param {string} entityId - 实体ID
   * @param {number} level - LOD级别
   */
  applyLOD(entityId, level) {
    const model = this.models.get(entityId)
    if (!model) return
    
    // 根据LOD级别调整模型细节
    switch (level) {
      case 0: // 高细节
        model.maximumScale = 20000
        model.minimumPixelSize = 64
        break
      case 1: // 中等细节
        model.maximumScale = 10000
        model.minimumPixelSize = 32
        break
      case 2: // 低细节
        model.maximumScale = 5000
        model.minimumPixelSize = 16
        break
      default: // 最低细节或隐藏
        model.show = level < 4
        break
    }
  }

  /**
   * 渲染帧更新
   */
  update() {
    super.update()
    
    // 更新LOD
    this.updateLOD()
    
    // 更新动画
    this.updateAnimations()
    
    // 更新统计
    this.updateStats()
  }

  /**
   * 更新动画
   */
  updateAnimations() {
    if (!this.animationSystem.enabled) return
    
    // 更新动画时钟
    this.animationSystem.clock.tick()
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.modelsRendered = this.models.size
    this.stats.memoryUsage = this.calculateMemoryUsage()
  }

  /**
   * 计算内存使用量
   * @returns {number} 内存使用量（字节）
   */
  calculateMemoryUsage() {
    let usage = 0
    
    // 估算模型内存使用
    this.models.forEach(model => {
      // 简单估算，实际应该更精确
      usage += 1024 * 1024 // 1MB per model
    })
    
    return usage
  }

  /**
   * 克隆模型
   * @param {Object} originalModel - 原始模型
   * @returns {Object} 克隆的模型
   */
  cloneModel(originalModel) {
    // 实现模型克隆逻辑
    // 这里简化处理，实际应该深度克隆
    return originalModel.clone ? originalModel.clone() : originalModel
  }

  /**
   * 清理资源
   */
  dispose() {
    // 停止所有动画
    this.animations.forEach(animation => {
      animation.stop()
    })
    this.animations.clear()
    
    // 移除所有模型
    this.models.forEach(model => {
      this.viewer.scene.primitives.remove(model)
    })
    this.models.clear()
    
    // 清理缓存
    this.modelCache.clear()
    this.lodLevels.clear()
    
    super.dispose()
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      type: this.type,
      timestamp: Date.now()
    }
  }
}

export default ModelRenderer