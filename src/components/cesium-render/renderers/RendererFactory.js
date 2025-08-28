/**
 * 渲染器工厂 - 负责创建和管理不同类型的实体渲染器
 * 支持点位、轨迹、关系、事件、区域等多种渲染器
 */

import * as Cesium from 'cesium'
import PointRenderer from './PointRenderer.js'
import TrajectoryRenderer from './TrajectoryRenderer.js'
import RelationRenderer from './RelationRenderer.js'
import EventRenderer from './EventRenderer.js'
import AreaRenderer from './AreaRenderer.js'
import RouteRenderer from './RouteRenderer.js'
import ModelRenderer from './ModelRenderer.js'
import ParticleRenderer from './ParticleRenderer.js'

class RendererFactory {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.scene = viewer.scene

    // 配置选项
    this.options = {
      enableBatching: true,
      enableInstancing: true,
      maxBatchSize: 1000,
      enableShaderOptimization: true,
      enableGeometryCompression: true,
      ...options,
    }

    // 渲染器注册表
    this.renderers = new Map()
    this.rendererInstances = new Map()

    // 渲染器配置
    this.rendererConfigs = new Map()

    // 批处理管理
    this.batchManager = {
      batches: new Map(), // type -> BatchRenderer
      pendingEntities: new Map(), // type -> entities[]
      batchSize: this.options.maxBatchSize,
      enabled: this.options.enableBatching,
    }

    // 实例化管理
    this.instanceManager = {
      instances: new Map(), // geometryId -> InstancedRenderer
      enabled: this.options.enableInstancing,
    }

    // 材质管理
    this.materialManager = {
      materials: new Map(), // materialId -> Material
      shaders: new Map(), // shaderId -> Shader
      textures: new Map(), // textureId -> Texture
    }

    // 几何体管理
    this.geometryManager = {
      geometries: new Map(), // geometryId -> Geometry
      primitives: new Map(), // primitiveId -> Primitive
      buffers: new Map(), // bufferId -> Buffer
    }

    // 性能统计
    this.stats = {
      renderCalls: 0,
      batchedEntities: 0,
      instancedEntities: 0,
      totalEntities: 0,
      memoryUsage: 0,
      lastUpdateTime: 0,
    }

    this.init()
  }

  /**
   * 初始化渲染器工厂
   */
  init() {
    // 注册默认渲染器
    this.registerDefaultRenderers()

    // 初始化材质库
    this.initMaterialLibrary()

    // 初始化几何体库
    this.initGeometryLibrary()
  }

  /**
   * 注册默认渲染器
   */
  registerDefaultRenderers() {
    // 点位渲染器
    this.registerRenderer('point', PointRenderer, {
      enableBillboard: true,
      enableLabel: true,
      enableClustering: true,
      clusterPixelRange: 80,
      clusterMinimumSize: 50,
    })

    // 轨迹渲染器
    this.registerRenderer('trajectory', TrajectoryRenderer, {
      enableAnimation: true,
      enableInterpolation: true,
      lineWidth: 2,
      showDirection: true,
      enableTrail: true,
    })

    // 关系渲染器
    this.registerRenderer('relation', RelationRenderer, {
      enableArrow: true,
      enableLabel: true,
      lineStyle: 'solid',
      enableAnimation: false,
    })

    // 事件渲染器
    this.registerRenderer('event', EventRenderer, {
      enablePulse: true,
      enableRipple: true,
      duration: 3000,
      enableFade: true,
    })

    // 区域渲染器
    this.registerRenderer('area', AreaRenderer, {
      enableFill: true,
      enableOutline: true,
      enableExtrusion: false,
      enablePattern: false,
    })

    // 路线渲染器
    this.registerRenderer('route', RouteRenderer, {
      enableArrow: true,
      enableWaypoints: true,
      lineWidth: 3,
      enableAnimation: true,
    })

    // 模型渲染器
    this.registerRenderer('model', ModelRenderer, {
      enableShadows: true,
      enableLighting: true,
      enableAnimation: true,
      enableLOD: true,
    })

    // 粒子渲染器
    this.registerRenderer('particle', ParticleRenderer, {
      maxParticles: 1000,
      enablePhysics: false,
      enableCollision: false,
      enableWind: false,
    })
  }

  /**
   * 注册渲染器
   * @param {string} type - 渲染器类型
   * @param {Class} RendererClass - 渲染器类
   * @param {Object} config - 配置选项
   */
  registerRenderer(type, RendererClass, config = {}) {
    this.renderers.set(type, RendererClass)
    this.rendererConfigs.set(type, {
      ...config,
      type,
      factory: this,
    })
  }

  /**
   * 获取渲染器实例
   * @param {string} type - 渲染器类型
   * @param {Object} options - 选项
   * @returns {Object} 渲染器实例
   */
  getRenderer(type, options = {}) {
    const instanceKey = `${type}_${JSON.stringify(options)}`

    // 检查是否已存在实例
    if (this.rendererInstances.has(instanceKey)) {
      return this.rendererInstances.get(instanceKey)
    }

    // 获取渲染器类
    const RendererClass = this.renderers.get(type)
    if (!RendererClass) {
      throw new Error(`Unknown renderer type: ${type}`)
    }

    // 合并配置
    const config = {
      ...this.rendererConfigs.get(type),
      ...options,
      viewer: this.viewer,
      factory: this,
    }

    // 创建实例
    const renderer = new RendererClass(config)
    this.rendererInstances.set(instanceKey, renderer)

    return renderer
  }

  /**
   * 创建批处理渲染器
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   * @returns {Object} 批处理渲染器
   */
  createBatchRenderer(type, entities, options = {}) {
    if (!this.batchManager.enabled || entities.length < 10) {
      // 实体数量太少，不使用批处理
      return this.getRenderer(type, options)
    }

    const batchKey = `${type}_batch`

    // 检查是否已存在批处理渲染器
    if (this.batchManager.batches.has(batchKey)) {
      const batchRenderer = this.batchManager.batches.get(batchKey)
      batchRenderer.addEntities(entities)
      return batchRenderer
    }

    // 创建批处理渲染器
    const BatchRendererClass = this.getBatchRendererClass(type)
    if (!BatchRendererClass) {
      // 不支持批处理，使用普通渲染器
      return this.getRenderer(type, options)
    }

    const config = {
      ...this.rendererConfigs.get(type),
      ...options,
      viewer: this.viewer,
      factory: this,
      batchSize: this.batchManager.batchSize,
      entities,
    }

    const batchRenderer = new BatchRendererClass(config)
    this.batchManager.batches.set(batchKey, batchRenderer)

    return batchRenderer
  }

  /**
   * 创建实例化渲染器
   * @param {string} type - 渲染器类型
   * @param {string} geometryId - 几何体ID
   * @param {Array} instances - 实例数组
   * @param {Object} options - 选项
   * @returns {Object} 实例化渲染器
   */
  createInstancedRenderer(type, geometryId, instances, options = {}) {
    if (!this.instanceManager.enabled || instances.length < 5) {
      // 实例数量太少，不使用实例化
      return this.getRenderer(type, options)
    }

    const instanceKey = `${type}_${geometryId}_instanced`

    // 检查是否已存在实例化渲染器
    if (this.instanceManager.instances.has(instanceKey)) {
      const instancedRenderer = this.instanceManager.instances.get(instanceKey)
      instancedRenderer.addInstances(instances)
      return instancedRenderer
    }

    // 创建实例化渲染器
    const InstancedRendererClass = this.getInstancedRendererClass(type)
    if (!InstancedRendererClass) {
      // 不支持实例化，使用普通渲染器
      return this.getRenderer(type, options)
    }

    const config = {
      ...this.rendererConfigs.get(type),
      ...options,
      viewer: this.viewer,
      factory: this,
      geometryId,
      instances,
    }

    const instancedRenderer = new InstancedRendererClass(config)
    this.instanceManager.instances.set(instanceKey, instancedRenderer)

    return instancedRenderer
  }

  /**
   * 渲染实体
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   * @returns {Promise} 渲染结果
   */
  async render(type, entities, options = {}) {
    const startTime = performance.now()

    try {
      // 选择最优渲染策略
      const renderer = this.selectOptimalRenderer(type, entities, options)

      // 执行渲染
      const result = await renderer.render(entities, options)

      // 更新统计
      this.updateStats(type, entities, performance.now() - startTime)

      return result
    } catch (error) {
      console.error('Render error:', error)
      throw error
    }
  }

  /**
   * 选择最优渲染器
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @param {Object} options - 选项
   * @returns {Object} 渲染器实例
   */
  selectOptimalRenderer(type, entities, options) {
    const entityCount = entities.length

    // 检查是否可以使用实例化渲染
    if (this.canUseInstancing(type, entities)) {
      const geometryId = this.extractGeometryId(entities)
      const instances = this.extractInstances(entities)
      return this.createInstancedRenderer(type, geometryId, instances, options)
    }

    // 检查是否可以使用批处理渲染
    if (this.canUseBatching(type, entities)) {
      return this.createBatchRenderer(type, entities, options)
    }

    // 使用普通渲染器
    return this.getRenderer(type, options)
  }

  /**
   * 检查是否可以使用实例化渲染
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @returns {boolean} 是否可以使用实例化
   */
  canUseInstancing(type, entities) {
    if (!this.instanceManager.enabled || entities.length < 5) {
      return false
    }

    // 检查实体是否使用相同的几何体
    const firstGeometry = this.extractGeometryId(entities.slice(0, 1))
    return entities.every((entity) => this.extractGeometryId([entity]) === firstGeometry)
  }

  /**
   * 检查是否可以使用批处理渲染
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @returns {boolean} 是否可以使用批处理
   */
  canUseBatching(type, entities) {
    if (!this.batchManager.enabled || entities.length < 10) {
      return false
    }

    // 检查渲染器是否支持批处理
    return this.getBatchRendererClass(type) !== null
  }

  /**
   * 提取几何体ID
   * @param {Array} entities - 实体数组
   * @returns {string} 几何体ID
   */
  extractGeometryId(entities) {
    if (entities.length === 0) return null

    const entity = entities[0]
    return entity.geometryId || entity.type || 'default'
  }

  /**
   * 提取实例数据
   * @param {Array} entities - 实体数组
   * @returns {Array} 实例数组
   */
  extractInstances(entities) {
    return entities.map((entity) => ({
      position: entity.position,
      rotation: entity.rotation || { x: 0, y: 0, z: 0 },
      scale: entity.scale || { x: 1, y: 1, z: 1 },
      color: entity.color || { r: 1, g: 1, b: 1, a: 1 },
      properties: entity.properties || {},
    }))
  }

  /**
   * 获取批处理渲染器类
   * @param {string} type - 渲染器类型
   * @returns {Class|null} 批处理渲染器类
   */
  getBatchRendererClass(type) {
    const batchRenderers = {
      point: 'PointBatchRenderer',
      model: 'ModelBatchRenderer',
      particle: 'ParticleBatchRenderer',
    }

    const className = batchRenderers[type]
    if (className) {
      // 动态导入批处理渲染器
      // try {
      //   return require(`./batch/${className}.js`).default
      // } catch (error) {
      //   console.warn(`Batch renderer not found: ${className}`)
      //   return null
      // }
    }

    return null
  }

  /**
   * 获取实例化渲染器类
   * @param {string} type - 渲染器类型
   * @returns {Class|null} 实例化渲染器类
   */
  getInstancedRendererClass(type) {
    const instancedRenderers = {
      point: 'PointInstancedRenderer',
      model: 'ModelInstancedRenderer',
    }

    const className = instancedRenderers[type]
    if (className) {
      // 动态导入实例化渲染器
      try {
        return require(`./instanced/${className}.js`).default
      } catch (error) {
        console.warn(`Instanced renderer not found: ${className}`)
        return null
      }
    }

    return null
  }

  /**
   * 初始化材质库
   */
  initMaterialLibrary() {
    // 基础材质
    this.materialManager.materials.set('basic', {
      type: 'basic',
      color: Cesium.Color.WHITE,
      transparent: false,
    })

    // 发光材质
    this.materialManager.materials.set('emissive', {
      type: 'emissive',
      color: Cesium.Color.CYAN,
      intensity: 1.0,
    })

    // 脉冲材质
    this.materialManager.materials.set('pulse', {
      type: 'pulse',
      color: Cesium.Color.RED,
      speed: 1.0,
      intensity: 0.5,
    })

    // 流动材质
    this.materialManager.materials.set('flow', {
      type: 'flow',
      color: Cesium.Color.BLUE,
      speed: 2.0,
      direction: { x: 1, y: 0 },
    })

    // 渐变材质
    this.materialManager.materials.set('gradient', {
      type: 'gradient',
      startColor: Cesium.Color.RED,
      endColor: Cesium.Color.BLUE,
      direction: 'horizontal',
    })
  }

  /**
   * 初始化几何体库
   */
  initGeometryLibrary() {
    // 基础几何体
    this.geometryManager.geometries.set('sphere', {
      type: 'sphere',
      radius: 1.0,
      segments: 32,
    })

    this.geometryManager.geometries.set('box', {
      type: 'box',
      width: 1.0,
      height: 1.0,
      depth: 1.0,
    })

    this.geometryManager.geometries.set('cylinder', {
      type: 'cylinder',
      radius: 1.0,
      height: 2.0,
      segments: 32,
    })

    this.geometryManager.geometries.set('plane', {
      type: 'plane',
      width: 1.0,
      height: 1.0,
      segments: 1,
    })
  }

  /**
   * 创建材质
   * @param {string} type - 材质类型
   * @param {Object} options - 选项
   * @returns {Object} 材质对象
   */
  createMaterial(type, options = {}) {
    const materialConfig = this.materialManager.materials.get(type)
    if (!materialConfig) {
      throw new Error(`Unknown material type: ${type}`)
    }

    const config = { ...materialConfig, ...options }

    switch (type) {
      case 'basic':
        return new Cesium.ColorMaterialProperty(config.color)

      case 'emissive':
        return new Cesium.ColorMaterialProperty(
          Cesium.Color.fromAlpha(config.color, config.intensity),
        )

      case 'pulse':
        return this.createPulseMaterial(config)

      case 'flow':
        return this.createFlowMaterial(config)

      case 'gradient':
        return this.createGradientMaterial(config)

      default:
        return new Cesium.ColorMaterialProperty(Cesium.Color.WHITE)
    }
  }

  /**
   * 创建脉冲材质
   * @param {Object} config - 配置
   * @returns {Object} 脉冲材质
   */
  createPulseMaterial(config) {
    return new Cesium.MaterialProperty({
      fabric: {
        type: 'Pulse',
        uniforms: {
          color: config.color,
          speed: config.speed,
          intensity: config.intensity,
        },
        source: `
          uniform vec3 color;
          uniform float speed;
          uniform float intensity;

          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            float pulse = sin(czm_frameNumber * speed * 0.01) * 0.5 + 0.5;
            material.diffuse = color;
            material.alpha = pulse * intensity;
            return material;
          }
        `,
      },
    })
  }

  /**
   * 创建流动材质
   * @param {Object} config - 配置
   * @returns {Object} 流动材质
   */
  createFlowMaterial(config) {
    return new Cesium.MaterialProperty({
      fabric: {
        type: 'Flow',
        uniforms: {
          color: config.color,
          speed: config.speed,
          direction: config.direction,
        },
        source: `
          uniform vec3 color;
          uniform float speed;
          uniform vec2 direction;

          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            float time = czm_frameNumber * speed * 0.01;
            vec2 flowSt = st + direction * time;
            float flow = fract(flowSt.x + flowSt.y);
            material.diffuse = color;
            material.alpha = flow;
            return material;
          }
        `,
      },
    })
  }

  /**
   * 创建渐变材质
   * @param {Object} config - 配置
   * @returns {Object} 渐变材质
   */
  createGradientMaterial(config) {
    return new Cesium.MaterialProperty({
      fabric: {
        type: 'Gradient',
        uniforms: {
          startColor: config.startColor,
          endColor: config.endColor,
          direction: config.direction === 'vertical' ? 1.0 : 0.0,
        },
        source: `
          uniform vec3 startColor;
          uniform vec3 endColor;
          uniform float direction;

          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            float t = direction > 0.5 ? st.y : st.x;
            material.diffuse = mix(startColor, endColor, t);
            return material;
          }
        `,
      },
    })
  }

  /**
   * 创建几何体
   * @param {string} type - 几何体类型
   * @param {Object} options - 选项
   * @returns {Object} 几何体对象
   */
  createGeometry(type, options = {}) {
    const geometryConfig = this.geometryManager.geometries.get(type)
    if (!geometryConfig) {
      throw new Error(`Unknown geometry type: ${type}`)
    }

    const config = { ...geometryConfig, ...options }

    switch (type) {
      case 'sphere':
        return new Cesium.SphereGeometry({
          radius: config.radius,
          stackPartitions: config.segments,
          slicePartitions: config.segments,
        })

      case 'box':
        return new Cesium.BoxGeometry({
          dimensions: new Cesium.Cartesian3(config.width, config.height, config.depth),
        })

      case 'cylinder':
        return new Cesium.CylinderGeometry({
          topRadius: config.radius,
          bottomRadius: config.radius,
          length: config.height,
          slices: config.segments,
        })

      case 'plane':
        return new Cesium.PlaneGeometry({
          dimensions: new Cesium.Cartesian2(config.width, config.height),
        })

      default:
        return new Cesium.SphereGeometry({ radius: 1.0 })
    }
  }

  /**
   * 更新统计信息
   * @param {string} type - 渲染器类型
   * @param {Array} entities - 实体数组
   * @param {number} renderTime - 渲染时间
   */
  updateStats(type, entities, renderTime) {
    this.stats.renderCalls++
    this.stats.totalEntities += entities.length
    this.stats.lastUpdateTime = renderTime

    // 统计批处理和实例化实体数量
    const renderer = this.getRenderer(type)
    if (renderer.isBatched) {
      this.stats.batchedEntities += entities.length
    }
    if (renderer.isInstanced) {
      this.stats.instancedEntities += entities.length
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      rendererCount: this.rendererInstances.size,
      batchCount: this.batchManager.batches.size,
      instanceCount: this.instanceManager.instances.size,
      materialCount: this.materialManager.materials.size,
      geometryCount: this.geometryManager.geometries.size,
    }
  }

  /**
   * 清理未使用的资源
   */
  cleanup() {
    // 清理未使用的渲染器实例
    for (const [key, renderer] of this.rendererInstances.entries()) {
      if (renderer.canDestroy && renderer.canDestroy()) {
        renderer.destroy()
        this.rendererInstances.delete(key)
      }
    }

    // 清理批处理渲染器
    for (const [key, batchRenderer] of this.batchManager.batches.entries()) {
      if (batchRenderer.isEmpty()) {
        batchRenderer.destroy()
        this.batchManager.batches.delete(key)
      }
    }

    // 清理实例化渲染器
    for (const [key, instancedRenderer] of this.instanceManager.instances.entries()) {
      if (instancedRenderer.isEmpty()) {
        instancedRenderer.destroy()
        this.instanceManager.instances.delete(key)
      }
    }
  }

  /**
   * 销毁渲染器工厂
   */
  destroy() {
    // 销毁所有渲染器实例
    this.rendererInstances.forEach((renderer) => {
      if (renderer.destroy) {
        renderer.destroy()
      }
    })

    // 销毁批处理渲染器
    this.batchManager.batches.forEach((batchRenderer) => {
      if (batchRenderer.destroy) {
        batchRenderer.destroy()
      }
    })

    // 销毁实例化渲染器
    this.instanceManager.instances.forEach((instancedRenderer) => {
      if (instancedRenderer.destroy) {
        instancedRenderer.destroy()
      }
    })

    // 清理缓存
    this.renderers.clear()
    this.rendererInstances.clear()
    this.rendererConfigs.clear()
    this.batchManager.batches.clear()
    this.instanceManager.instances.clear()
    this.materialManager.materials.clear()
    this.materialManager.shaders.clear()
    this.materialManager.textures.clear()
    this.geometryManager.geometries.clear()
    this.geometryManager.primitives.clear()
    this.geometryManager.buffers.clear()
  }
}

export default RendererFactory
