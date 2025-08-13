import {
  ParabolaFlyLineMaterialProperty,
  PulseLineMaterialProperty,
  DynamicTextureMaterialProperty,
} from './materialProperties.js'

/**
 * 材质属性管理器
 */
export class MaterialPropertyManager {
  constructor() {
    this.initializeMaterials()
  }

  /**
   * 初始化材质属性管理器
   * 注意：实际的Cesium材质注册在materialProperties.js中的MaterialPropertyManager类中完成
   */
  initializeMaterials() {
    // 材质属性管理器不需要注册Cesium材质
    // 材质注册由materialProperties.js中的MaterialPropertyManager处理
    console.log('MaterialPropertyManager initialized')
  }

  /**
   * 创建抛物线飞线材质属性
   */
  createParabolaFlyLineMaterialProperty(options = {}) {
    return new ParabolaFlyLineMaterialProperty(options)
  }

  /**
   * 创建脉冲线材质属性
   */
  createPulseLineMaterialProperty(options = {}) {
    return new PulseLineMaterialProperty(options)
  }

  /**
   * 创建动态纹理材质属性
   */
  createDynamicTextureMaterialProperty(options = {}) {
    return new DynamicTextureMaterialProperty(options)
  }

  /**
   * 根据类型创建材质属性
   */
  createMaterialPropertyByType(type, options = {}) {
    switch (type) {
      case 'flyline':
      case 'ParabolaFlyLine':
        return this.createParabolaFlyLineMaterialProperty(options)
      case 'pulse':
      case 'PulseLine':
        return this.createPulseLineMaterialProperty(options)
      case 'dynamic':
      case 'DynamicTexture':
        return this.createDynamicTextureMaterialProperty(options)
      default:
        return new window.Cesium.ColorMaterialProperty(options.color || window.Cesium.Color.WHITE)
    }
  }

  /**
   * 为抛物线创建材质属性
   */
  createParabolaMaterialProperty(startPoint, endPoint, options = {}) {
    const { materialType = 'flyline', color, speed, ...otherOptions } = options

    const materialOptions = {
      ...otherOptions,
    }

    if (color) {
      materialOptions.color = color
    }
    if (speed !== undefined) {
      materialOptions.speed = speed
    }

    return this.createMaterialPropertyByType(materialType, materialOptions)
  }
}

// 导出单例实例
export const materialPropertyManager = new MaterialPropertyManager()

// 导出便捷函数
export function createParabolaFlyLineMaterial(options) {
  return materialPropertyManager.createParabolaFlyLineMaterialProperty(options)
}

export function createPulseLineMaterial(options) {
  return materialPropertyManager.createPulseLineMaterialProperty(options)
}

export function createMaterialByType(type, options) {
  return materialPropertyManager.createMaterialPropertyByType(type, options)
}
