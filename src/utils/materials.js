import { generateParabola, calculateOptimalHeight } from './parabola.js'
import {
  ParabolaFlyLineMaterialProperty,
  PulseLineMaterialProperty,
  DynamicTextureMaterialProperty,
} from './materialProperties.js'
import { 
  materialPropertyManager,
  createParabolaFlyLineMaterial,
  createPulseLineMaterial 
} from './materialPropertyManager.js'
import { createMaterialConfig } from './shaders.js'

/**
 * 自定义材质管理器
 */
export class MaterialManager {
  constructor() {
    this.materials = new Map()
    this.initialized = false
  }

  /**
   * 初始化自定义材质
   */
  initCustomMaterials() {
    if (this.initialized || !window.Cesium) {
      return
    }

    // 飞线材质
    this.createFlyLineMaterial()
    // 脉冲线材质
    this.createPulseLineMaterial()
    // 动态纹理材质
    this.createDynamicTextureMaterial()

    this.initialized = true
  }

  /**
   * 创建飞线材质
   */
  createFlyLineMaterial() {
    const materialConfig = createMaterialConfig('FlyLine', {
      color: new window.Cesium.Color(0.0, 1.0, 1.0, 1.0),
      speed: 1.0,
    })

    window.Cesium.Material._materialCache.addMaterial('FlyLine', materialConfig)
    this.materials.set('FlyLine', 'FlyLine')
  }

  /**
   * 创建脉冲线材质
   */
  createPulseLineMaterial() {
    const materialConfig = createMaterialConfig('PulseLine', {
      color: new window.Cesium.Color(1.0, 0.5, 0.0, 1.0),
      speed: 2.0,
    })

    window.Cesium.Material._materialCache.addMaterial('PulseLine', materialConfig)
    this.materials.set('PulseLine', 'PulseLine')
  }

  /**
   * 创建动态纹理材质
   */
  createDynamicTextureMaterial() {
    const materialConfig = createMaterialConfig('DynamicTexture', {
      color: new window.Cesium.Color(1.0, 0.6, 0.2, 1.0), // 橙色
      speed: 1.5,
    })

    window.Cesium.Material._materialCache.addMaterial('DynamicTexture', materialConfig)
    this.materials.set('DynamicTexture', 'DynamicTexture')
  }

  /**
   * 获取飞线材质
   * @param {Object} options 材质选项
   * @returns {Cesium.Material}
   */
  getFlyLineMaterial(options = {}) {
    const { color = new window.Cesium.Color(0.0, 1.0, 1.0, 1.0), speed = 1.0 } = options

    return new window.Cesium.Material({
      fabric: {
        type: 'FlyLine',
        uniforms: {
          color: color,
          speed: speed,
        },
      },
    })
  }

  /**
   * 获取脉冲线材质
   * @param {Object} options 材质选项
   * @returns {Cesium.Material}
   */
  getPulseLineMaterial(options = {}) {
    const { color = new Cesium.Color(1.0, 0.5, 0.0, 1.0), speed = 2.0 } = options

    return new Cesium.Material({
      fabric: {
        type: 'PulseLine',
        uniforms: {
          color: color,
          speed: speed,
        },
      },
    })
  }

  /**
   * 获取动态纹理材质
   * @param {Object} options 材质选项
   * @returns {Cesium.Material}
   */
  getDynamicTextureMaterial(options = {}) {
    const { color = new window.Cesium.Color(1.0, 0.6, 0.2, 1.0), speed = 1.5 } = options

    return new window.Cesium.Material({
      fabric: {
        type: 'DynamicTexture',
        uniforms: {
          color: color,
          speed: speed,
        },
      },
    })
  }

  /**
   * 根据关系类型获取材质
   * @param {string} relationshipType 关系类型
   * @returns {Object}
   */
  getMaterialByRelationType(relationshipType) {
    switch (relationshipType) {
      case '航线连接':
        return {
          type: 'flyline',
          material: this.getFlyLineMaterial({
            color: new Cesium.Color(0.0, 0.8, 1.0, 0.8), // 蓝色 - 航空
            speed: 2.0,
          }),
        }
      case '雷达覆盖':
        return {
          type: 'pulse',
          material: this.getPulseLineMaterial({
            color: new Cesium.Color(0.0, 1.0, 0.0, 0.9), // 绿色 - 雷达
            speed: 3.0,
          }),
        }
      case '海运航线':
        return {
          type: 'flyline',
          material: this.getFlyLineMaterial({
            color: new Cesium.Color(0.0, 0.5, 1.0, 0.7), // 深蓝色 - 海运
            speed: 1.0,
          }),
        }
      case '高铁线路':
        return {
          type: 'flyline',
          material: this.getFlyLineMaterial({
            color: new Cesium.Color(1.0, 0.8, 0.0, 0.8), // 金色 - 高铁
            speed: 2.5,
          }),
        }
      case '通信链路':
        return {
          type: 'pulse',
          material: this.getPulseLineMaterial({
            color: new Cesium.Color(0.8, 0.0, 1.0, 0.8), // 紫色 - 通信
            speed: 4.0,
          }),
        }
      case '军事协防':
        return {
          type: 'flyline',
          material: this.getFlyLineMaterial({
            color: new Cesium.Color(1.0, 0.0, 0.0, 0.9), // 红色 - 军事
            speed: 1.5,
          }),
        }
      case '数据传输': // 新增关系类型，使用动态纹理
        return {
          type: 'dynamic',
          material: this.getDynamicTextureMaterial({
            color: new Cesium.Color(1.0, 0.6, 0.2, 0.8), // 橙色 - 数据传输
            speed: 2.0,
          }),
        }
      default:
        return {
          type: 'normal',
          material: null,
        }
    }
  }

  /**
   * 生成抛物线轨迹
   * @param {Object} startPoint - 起始点 {longitude, latitude, height?}
   * @param {Object} endPoint - 终点 {longitude, latitude, height?}
   * @param {number} maxHeight - 抛物线最高高度（米）
   * @param {number} segments - 分段数量，默认50
   * @returns {Array} Cesium.Cartesian3坐标数组
   */
  generateParabolaTrajectory(startPoint, endPoint, maxHeight, segments = 50) {
    return generateParabola(startPoint, endPoint, maxHeight, segments)
  }

  /**
   * 根据两点距离自动计算抛物线高度
   * @param {Object} startPoint - 起始点
   * @param {Object} endPoint - 终点
   * @param {number} heightRatio - 高度比例，默认0.2
   * @returns {number} 建议的抛物线高度
   */
  calculateParabolaHeight(startPoint, endPoint, heightRatio = 0.2) {
    return calculateOptimalHeight(startPoint, endPoint, heightRatio)
  }

  /**
   * 创建抛物线飞线效果
   * @param {Object} startPoint - 起始点
   * @param {Object} endPoint - 终点
   * @param {Object} options - 配置选项
   * @param {number} options.maxHeight - 最高高度，不传则自动计算
   * @param {number} options.segments - 分段数量
   * @param {string} options.materialType - 材质类型 'flyline' | 'pulse'
   * @param {Object} options.materialOptions - 材质配置
   * @param {boolean} options.useProperty - 是否使用 MaterialProperty，默认 false
   * @returns {Object} 包含轨迹和材质的对象
   */
  createParabolaFlyLine(startPoint, endPoint, options = {}) {
    const {
      maxHeight = this.calculateParabolaHeight(startPoint, endPoint),
      segments = 50,
      materialType = 'flyline',
      materialOptions = {},
      useProperty = false,
    } = options

    // 生成抛物线轨迹
    const positions = this.generateParabolaTrajectory(startPoint, endPoint, maxHeight, segments)

    // 获取材质
    let material
    if (useProperty) {
      // 使用 MaterialProperty
      material = materialPropertyManager.createMaterialPropertyByType(materialType, {
        color: new Cesium.Color(0.0, 1.0, 1.0, 0.8),
        speed: materialType === 'flyline' ? 2.0 : 1.5,
        ...materialOptions,
      })
    } else {
      // 使用传统 Material
      if (materialType === 'flyline') {
        material = this.getFlyLineMaterial({
          color: new Cesium.Color(0.0, 1.0, 1.0, 0.8), // 默认青色
          speed: 2.0,
          ...materialOptions,
        })
      } else if (materialType === 'pulse') {
        material = this.getPulseLineMaterial({
          color: new Cesium.Color(1.0, 0.5, 0.0, 0.9), // 默认橙色
          speed: 1.5,
          ...materialOptions,
        })
      } else {
        material = new Cesium.Color(1.0, 1.0, 1.0, 1.0) // 默认白色
      }
    }

    return {
      positions,
      material,
      materialType,
      useProperty,
      trajectory: {
        startPoint,
        endPoint,
        maxHeight,
        segments,
      },
    }
  }

  /**
   * 创建 MaterialProperty 版本的飞线材质
   * @param {Object} options - 材质配置
   * @returns {ParabolaFlyLineMaterialProperty}
   */
  createFlyLineMaterialProperty(options = {}) {
    return createParabolaFlyLineMaterial({
      color: new Cesium.Color(0.0, 1.0, 1.0, 0.8),
      speed: 2.0,
      percent: 0.1,
      gradient: 0.1,
      ...options,
    })
  }

  /**
   * 创建 MaterialProperty 版本的脉冲材质
   * @param {Object} options - 材质配置
   * @returns {PulseLineMaterialProperty}
   */
  createPulseLineMaterialProperty(options = {}) {
    return createPulseLineMaterial({
      color: new Cesium.Color(1.0, 0.5, 0.0, 0.9),
      speed: 1.5,
      pulseWidth: 0.2,
      ...options,
    })
  }

  /**
   * 创建 MaterialProperty 版本的动态纹理材质
   * @param {Object} options - 材质配置
   * @returns {DynamicTextureMaterialProperty}
   */
  createDynamicTextureMaterialProperty(options = {}) {
    return new DynamicTextureMaterialProperty({
      color: new Cesium.Color(1.0, 0.6, 0.2, 0.8),
      speed: 1.5,
      ...options,
    })
  }

  /**
   * 根据关系类型获取 MaterialProperty
   * @param {string} relationType - 关系类型
   * @param {Object} options - 配置选项
   * @returns {MaterialProperty}
   */
  getMaterialPropertyByRelationType(relationType, options = {}) {
    switch (relationType) {
      case '航线连接':
        return this.createFlyLineMaterialProperty({
          color: new Cesium.Color(0.0, 0.8, 1.0, 0.8), // 蓝色 - 航空
          speed: 2.0,
          ...options,
        })
      case '雷达覆盖':
        return this.createPulseLineMaterialProperty({
          color: new Cesium.Color(0.0, 1.0, 0.0, 0.9), // 绿色 - 雷达
          speed: 3.0,
          ...options,
        })
      case '海运航线':
        return this.createFlyLineMaterialProperty({
          color: new Cesium.Color(0.0, 0.5, 1.0, 0.7), // 深蓝色 - 海运
          speed: 1.0,
          ...options,
        })
      case '高铁线路':
        return this.createFlyLineMaterialProperty({
          color: new Cesium.Color(1.0, 0.8, 0.0, 0.8), // 金色 - 高铁
          speed: 2.5,
          ...options,
        })
      case '通信链路':
        return this.createPulseLineMaterialProperty({
          color: new Cesium.Color(0.8, 0.0, 1.0, 0.8), // 紫色 - 通信
          speed: 4.0,
          ...options,
        })
      case '军事协防':
        return this.createFlyLineMaterialProperty({
          color: new Cesium.Color(1.0, 0.0, 0.0, 0.9), // 红色 - 军事
          speed: 1.5,
          ...options,
        })
      case '数据传输':
        return this.createDynamicTextureMaterialProperty({
          color: new Cesium.Color(1.0, 0.6, 0.2, 0.8), // 橙色 - 数据传输
          speed: 2.0,
          ...options,
        })
      default:
        return new Cesium.ColorMaterialProperty(
          options.color || new Cesium.Color(1.0, 1.0, 1.0, 1.0),
        )
    }
  }
}
