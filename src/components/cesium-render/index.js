/**
 * Cesium 原生渲染引擎 - 主入口文件
 * 提供统一的API接口，整合所有核心组件
 */

import RenderEngine from './core/RenderEngine.js'
import Layer from './core/Layer.js'
import DataAdapter from './core/DataAdapter.js'
import EntityManager from './core/EntityManager.js'
import TimeManager from './core/TimeManager.js'
import PerformanceOptimizer from './core/PerformanceOptimizer.js'

import RendererFactory from './renderers/RendererFactory.js'
import PointRenderer from './renderers/PointRenderer.js'
import TrajectoryRenderer from './renderers/TrajectoryRenderer.js'
import RelationRenderer from './renderers/RelationRenderer.js'
import EventRenderer from './renderers/EventRenderer.js'
import AreaRenderer from './renderers/AreaRenderer.js'
import RouteRenderer from './renderers/RouteRenderer.js'

import GeometryUtils from './utils/GeometryUtils.js'
import MaterialUtils from './utils/MaterialUtils.js'
import TimeUtils from './utils/TimeUtils.js'
import PerformanceUtils from './utils/PerformanceUtils.js'
import EventUtils from './utils/EventUtils.js'

/**
 * Cesium 渲染引擎类 - 主要API接口
 */
class CesiumRenderEngine {
  constructor(viewer, options = {}) {
    this.viewer = viewer
    this.options = {
      enablePerformanceMonitoring: true,
      enableLOD: true,
      enableClustering: false,
      maxEntities: 10000,
      timeRange: {
        start: null,
        end: null,
      },
      ...options,
    }

    // 初始化核心组件
    this.renderEngine = new RenderEngine(viewer, this.options)
    this.dataAdapter = new DataAdapter()
    this.entityManager = new EntityManager(viewer)
    this.timeManager = new TimeManager()
    this.performanceOptimizer = new PerformanceOptimizer(viewer)
    this.rendererFactory = new RendererFactory(viewer)

    // 图层管理
    this.layers = new Map()
    this.layerOrder = []

    // 事件管理
    this.eventBus = EventUtils.createEventBus()

    // 初始化
    this.initialize()
  }

  /**
   * 初始化渲染引擎
   */
  initialize() {
    // 启动渲染引擎
    this.renderEngine.start()

    // 启动性能监控
    if (this.options.enablePerformanceMonitoring) {
      PerformanceUtils.startMonitoring({
        interval: 1000,
        enableMemoryMonitoring: true,
        enableFrameRateMonitoring: true,
      })
    }

    // 绑定事件
    this.bindEvents()

    console.log('Cesium 渲染引擎初始化完成')
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 时间变化事件
    this.timeManager.on('timeChanged', (time) => {
      this.eventBus.publish('time.changed', time)
      this.updateLayersTime(time)
    })

    // 性能警告事件
    PerformanceUtils.on('onPerformanceWarning', (warnings) => {
      this.eventBus.publish('performance.warning', warnings)
      this.handlePerformanceWarnings(warnings)
    })

    // 图层事件
    this.eventBus.subscribe('layer.*', (data, options) => {
      console.log('图层事件:', data, options)
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
      console.warn(`图层 ${layerId} 已存在`)
      return this.layers.get(layerId)
    }

    const layerOptions = {
      id: layerId,
      name: options.name || layerId,
      visible: options.visible !== false,
      zIndex: options.zIndex || this.layerOrder.length,
      dataTypes: options.dataTypes || ['point', 'trajectory', 'relation', 'event', 'area', 'route'],
      renderOptions: {
        enableLOD: this.options.enableLOD,
        enableClustering: this.options.enableClustering,
        maxEntities: options.maxEntities || this.options.maxEntities,
        ...options.renderOptions,
      },
      ...options,
    }

    const layer = new Layer(this.viewer, layerOptions)

    // 设置渲染器工厂
    layer.setRendererFactory(this.rendererFactory)

    // 设置数据适配器
    layer.setDataAdapter(this.dataAdapter)

    // 设置实体管理器
    layer.setEntityManager(this.entityManager)

    // 设置时间管理器
    layer.setTimeManager(this.timeManager)

    // 绑定图层事件
    layer.on('dataUpdated', (data) => {
      this.eventBus.publish(`layer.${layerId}.dataUpdated`, data)
    })

    layer.on('visibilityChanged', (visible) => {
      this.eventBus.publish(`layer.${layerId}.visibilityChanged`, visible)
    })

    layer.on('entityClick', (entity, event) => {
      this.eventBus.publish(`layer.${layerId}.entityClick`, { entity, event })
    })

    layer.on('entityHover', (entity, event) => {
      this.eventBus.publish(`layer.${layerId}.entityHover`, { entity, event })
    })

    // 添加到图层管理
    this.layers.set(layerId, layer)
    this.layerOrder.push(layerId)
    debugger
    // 添加到渲染引擎
    this.renderEngine.addLayer(layer)

    console.log(`创建图层: ${layerId}`, layerOptions)

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
   * 移除图层
   * @param {string} layerId - 图层ID
   */
  removeLayer(layerId) {
    const layer = this.layers.get(layerId)
    if (!layer) {
      console.warn(`图层 ${layerId} 不存在`)
      return
    }

    // 从渲染引擎移除
    this.renderEngine.removeLayer(layer)

    // 销毁图层
    layer.destroy()

    // 从管理中移除
    this.layers.delete(layerId)
    const index = this.layerOrder.indexOf(layerId)
    if (index > -1) {
      this.layerOrder.splice(index, 1)
    }

    this.eventBus.publish(`layer.${layerId}.removed`)

    console.log(`移除图层: ${layerId}`)
  }

  /**
   * 获取所有图层
   * @returns {Array} 图层数组
   */
  getAllLayers() {
    return this.layerOrder.map((layerId) => this.layers.get(layerId))
  }

  /**
   * 设置图层可见性
   * @param {string} layerId - 图层ID
   * @param {boolean} visible - 是否可见
   */
  setLayerVisible(layerId, visible) {
    const layer = this.getLayer(layerId)
    if (layer) {
      layer.setVisible(visible)
    }
  }

  /**
   * 设置图层顺序
   * @param {Array} layerIds - 图层ID数组（按显示顺序）
   */
  setLayerOrder(layerIds) {
    // 验证图层ID
    const validLayerIds = layerIds.filter((layerId) => this.layers.has(layerId))

    if (validLayerIds.length !== layerIds.length) {
      console.warn('部分图层ID无效', layerIds)
    }

    this.layerOrder = validLayerIds

    // 更新图层zIndex
    validLayerIds.forEach((layerId, index) => {
      const layer = this.layers.get(layerId)
      if (layer) {
        layer.setZIndex(index)
      }
    })

    this.eventBus.publish('layers.orderChanged', validLayerIds)
  }

  /**
   * 添加数据到图层
   * @param {string} layerId - 图层ID
   * @param {string} dataType - 数据类型
   * @param {Array|Object} data - 数据
   * @param {Object} options - 选项
   */
  addData(layerId, dataType, data, options = {}) {
    const layer = this.getLayer(layerId)
    if (!layer) {
      console.error(`图层 ${layerId} 不存在`)
      return
    }

    // 数据适配
    const adaptedData = this.dataAdapter.adaptData(dataType, data, options)

    // 添加到图层
    layer.addData(dataType, adaptedData, options)

    console.log(`添加数据到图层 ${layerId}:`, {
      dataType,
      count: Array.isArray(data) ? data.length : 1,
    })
  }

  /**
   * 更新图层数据
   * @param {string} layerId - 图层ID
   * @param {string} dataType - 数据类型
   * @param {Array|Object} data - 数据
   * @param {Object} options - 选项
   */
  updateData(layerId, dataType, data, options = {}) {
    const layer = this.getLayer(layerId)
    if (!layer) {
      console.error(`图层 ${layerId} 不存在`)
      return
    }

    // 数据适配
    const adaptedData = this.dataAdapter.adaptData(dataType, data, options)

    // 更新图层数据
    layer.updateData(dataType, adaptedData, options)

    console.log(`更新图层 ${layerId} 数据:`, {
      dataType,
      count: Array.isArray(data) ? data.length : 1,
    })
  }

  /**
   * 移除图层数据
   * @param {string} layerId - 图层ID
   * @param {string} dataType - 数据类型
   * @param {Array|string} ids - 数据ID或ID数组
   */
  removeData(layerId, dataType, ids) {
    const layer = this.getLayer(layerId)
    if (!layer) {
      console.error(`图层 ${layerId} 不存在`)
      return
    }

    layer.removeData(dataType, ids)

    console.log(`移除图层 ${layerId} 数据:`, { dataType, ids })
  }

  /**
   * 清空图层数据
   * @param {string} layerId - 图层ID
   * @param {string} dataType - 数据类型（可选）
   */
  clearData(layerId, dataType = null) {
    const layer = this.getLayer(layerId)
    if (!layer) {
      console.error(`图层 ${layerId} 不存在`)
      return
    }

    layer.clearData(dataType)

    console.log(`清空图层 ${layerId} 数据:`, { dataType })
  }

  /**
   * 设置时间范围
   * @param {Date|string} startTime - 开始时间
   * @param {Date|string} endTime - 结束时间
   */
  setTimeRange(startTime, endTime) {
    this.timeManager.setTimeRange(startTime, endTime)
    this.options.timeRange = { start: startTime, end: endTime }

    // 更新所有图层的时间范围
    this.updateLayersTimeRange(startTime, endTime)

    console.log('设置时间范围:', { startTime, endTime })
  }

  /**
   * 设置当前时间
   * @param {Date|string} time - 当前时间
   */
  setCurrentTime(time) {
    this.timeManager.setCurrentTime(time)
  }

  /**
   * 播放时间动画
   * @param {Object} options - 播放选项
   */
  playTimeAnimation(options = {}) {
    this.timeManager.play(options)
  }

  /**
   * 暂停时间动画
   */
  pauseTimeAnimation() {
    this.timeManager.pause()
  }

  /**
   * 停止时间动画
   */
  stopTimeAnimation() {
    this.timeManager.stop()
  }

  /**
   * 更新所有图层的时间
   * @param {Date} time - 当前时间
   */
  updateLayersTime(time) {
    this.layers.forEach((layer) => {
      layer.setCurrentTime(time)
    })
  }

  /**
   * 更新所有图层的时间范围
   * @param {Date} startTime - 开始时间
   * @param {Date} endTime - 结束时间
   */
  updateLayersTimeRange(startTime, endTime) {
    this.layers.forEach((layer) => {
      layer.setTimeRange(startTime, endTime)
    })
  }

  /**
   * 处理性能警告
   * @param {Array} warnings - 警告列表
   */
  handlePerformanceWarnings(warnings) {
    warnings.forEach((warning) => {
      console.warn('性能警告:', warning)

      // 根据警告类型自动优化
      switch (warning.type) {
        case 'frameRate':
          this.optimizeFrameRate()
          break
        case 'memoryUsage':
          this.optimizeMemoryUsage()
          break
        case 'entityCount':
          this.optimizeEntityCount()
          break
      }
    })
  }

  /**
   * 优化帧率
   */
  optimizeFrameRate() {
    // 启用LOD
    this.layers.forEach((layer) => {
      layer.setLODEnabled(true)
    })

    // 降低渲染质量
    this.performanceOptimizer.setQualityLevel('medium')

    console.log('自动优化: 启用LOD和降低渲染质量')
  }

  /**
   * 优化内存使用
   */
  optimizeMemoryUsage() {
    // 清理未使用的实体
    this.entityManager.cleanup()

    // 启用实体池
    this.layers.forEach((layer) => {
      layer.setEntityPoolEnabled(true)
    })

    console.log('自动优化: 清理内存和启用实体池')
  }

  /**
   * 优化实体数量
   */
  optimizeEntityCount() {
    // 启用聚类
    this.layers.forEach((layer) => {
      layer.setClusteringEnabled(true)
    })

    // 启用视锥剔除
    this.performanceOptimizer.setFrustumCullingEnabled(true)

    console.log('自动优化: 启用聚类和视锥剔除')
  }

  /**
   * 获取性能统计
   * @returns {Object} 性能统计信息
   */
  getPerformanceStats() {
    return {
      engine: this.renderEngine.getStats(),
      performance: PerformanceUtils.getPerformanceStats(),
      layers: this.layers.size,
      entities: this.entityManager.getEntityCount(),
    }
  }

  /**
   * 获取渲染统计
   * @returns {Object} 渲染统计信息
   */
  getRenderStats() {
    const stats = {
      layers: {},
      total: {
        entities: 0,
        points: 0,
        trajectories: 0,
        relations: 0,
        events: 0,
        areas: 0,
        routes: 0,
      },
    }

    this.layers.forEach((layer, layerId) => {
      const layerStats = layer.getStats()
      stats.layers[layerId] = layerStats

      // 累计总数
      Object.keys(stats.total).forEach((key) => {
        if (layerStats[key]) {
          stats.total[key] += layerStats[key]
        }
      })
    })

    return stats
  }

  /**
   * 导出配置
   * @returns {Object} 配置对象
   */
  exportConfig() {
    const config = {
      options: this.options,
      layers: {},
      timeRange: this.timeManager.getTimeRange(),
      currentTime: this.timeManager.getCurrentTime(),
    }

    this.layers.forEach((layer, layerId) => {
      config.layers[layerId] = layer.exportConfig()
    })

    return config
  }

  /**
   * 导入配置
   * @param {Object} config - 配置对象
   */
  importConfig(config) {
    // 设置选项
    if (config.options) {
      this.options = { ...this.options, ...config.options }
    }

    // 设置时间范围
    if (config.timeRange) {
      this.setTimeRange(config.timeRange.start, config.timeRange.end)
    }

    // 设置当前时间
    if (config.currentTime) {
      this.setCurrentTime(config.currentTime)
    }

    // 创建图层
    if (config.layers) {
      Object.keys(config.layers).forEach((layerId) => {
        const layerConfig = config.layers[layerId]
        const layer = this.createLayer(layerId, layerConfig.options)
        layer.importConfig(layerConfig)
      })
    }

    console.log('导入配置完成:', config)
  }

  /**
   * 销毁渲染引擎
   */
  destroy() {
    // 停止性能监控
    PerformanceUtils.stopMonitoring()

    // 销毁所有图层
    this.layers.forEach((layer) => {
      layer.destroy()
    })
    this.layers.clear()
    this.layerOrder = []

    // 销毁核心组件
    this.renderEngine.destroy()
    this.entityManager.destroy()
    this.timeManager.destroy()
    this.performanceOptimizer.destroy()
    this.rendererFactory.destroy()
    this.eventBus.destroy()

    console.log('Cesium 渲染引擎已销毁')
  }

  /**
   * 事件订阅
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    return this.eventBus.subscribe(event, callback)
  }

  /**
   * 事件取消订阅
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    return this.eventBus.unsubscribe(event, callback)
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    return this.eventBus.publish(event, data)
  }

  /**
   * 设置性能预设
   * @param {string} preset - 性能预设 ('high-performance', 'balanced', 'high-quality')
   */
  setPerformancePreset(preset) {
    const presets = {
      'high-performance': {
        enableLOD: true,
        enableClustering: true,
        enableFrustumCulling: true,
        enableBatching: true,
        enableInstancing: true,
        maxEntities: 50000,
        antiAliasing: false,
        shadows: false,
        lighting: false,
        qualityLevel: 'low'
      },
      'balanced': {
        enableLOD: true,
        enableClustering: false,
        enableFrustumCulling: true,
        enableBatching: true,
        enableInstancing: false,
        maxEntities: 20000,
        antiAliasing: false,
        shadows: false,
        lighting: true,
        qualityLevel: 'medium'
      },
      'high-quality': {
        enableLOD: false,
        enableClustering: false,
        enableFrustumCulling: true,
        enableBatching: false,
        enableInstancing: false,
        maxEntities: 10000,
        antiAliasing: true,
        shadows: true,
        lighting: true,
        qualityLevel: 'high'
      }
    }

    const config = presets[preset]
    if (!config) {
      console.error(`未知的性能预设: ${preset}. 可用预设: ${Object.keys(presets).join(', ')}`)
      return
    }

    // 更新选项
    this.options = { ...this.options, ...config }

    // 应用到性能优化器
    if (this.performanceOptimizer) {
      this.performanceOptimizer.setQualityLevel(config.qualityLevel)
      this.performanceOptimizer.setFrustumCullingEnabled(config.enableFrustumCulling)
    }

    // 应用到所有图层
    this.layers.forEach((layer) => {
      layer.setLODEnabled(config.enableLOD)
      layer.setClusteringEnabled(config.enableClustering)
      layer.setMaxEntities(config.maxEntities)
    })

    // 更新渲染引擎配置
    if (this.renderEngine && this.renderEngine.config) {
      this.renderEngine.config.enableLOD = config.enableLOD
      this.renderEngine.config.enableCulling = config.enableFrustumCulling
      this.renderEngine.config.enableInstancing = config.enableInstancing
    }

    console.log(`应用性能预设: ${preset}`, config)
    this.eventBus.publish('performance.presetChanged', { preset, config })
  }

  /**
   * 获取当前性能预设
   * @returns {string|null} 当前性能预设名称
   */
  getCurrentPerformancePreset() {
    // 根据当前配置推断预设
    const currentConfig = this.options
    
    if (currentConfig.enableLOD && currentConfig.enableClustering && !currentConfig.antiAliasing) {
      return 'high-performance'
    } else if (currentConfig.enableLOD && !currentConfig.enableClustering && currentConfig.lighting) {
      return 'balanced'
    } else if (!currentConfig.enableLOD && currentConfig.antiAliasing && currentConfig.shadows) {
      return 'high-quality'
    }
    
    return null // 自定义配置
  }
}

// 导出所有组件
export {
  CesiumRenderEngine,
  RenderEngine,
  Layer,
  DataAdapter,
  EntityManager,
  TimeManager,
  PerformanceOptimizer,
  RendererFactory,
  PointRenderer,
  TrajectoryRenderer,
  RelationRenderer,
  EventRenderer,
  AreaRenderer,
  RouteRenderer,
  GeometryUtils,
  MaterialUtils,
  TimeUtils,
  PerformanceUtils,
  EventUtils,
}

// 默认导出主类
export default CesiumRenderEngine
