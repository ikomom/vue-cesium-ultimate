import { MATERIAL_TYPES } from '../constanst'
import {
  DynamicTextureMaterialProperty,
  ParabolaFlyLineMaterialProperty,
  PulseLineMaterialProperty,
} from './property'

/**
 * 根据材质类型获取对应的材质属性类
 * @param {string} materialType - 材质类型，来自MATERIAL_TYPES常量
 * @param {Object} options - 材质属性配置选项
 * @returns {Object|null} 对应的材质属性实例，如果类型不支持则返回null
 */
export function getMaterialProperty(materialType, options = {}) {
  switch (materialType) {
    case MATERIAL_TYPES.PolylineDynamicTexture:
      return new DynamicTextureMaterialProperty(options)

    case MATERIAL_TYPES.PolylineFlyLine:
      return new ParabolaFlyLineMaterialProperty(options)

    case MATERIAL_TYPES.PolylinePulseLine:
      return new PulseLineMaterialProperty(options)

    // Cesium内置材质类型
    case MATERIAL_TYPES.PolylineArrow:
    case MATERIAL_TYPES.PolylineDash:
    case MATERIAL_TYPES.PolylineGlow:
    case MATERIAL_TYPES.PolylineOutline:
      return { fabric: { type: materialType, uniforms: { ...options } } }
    case MATERIAL_TYPES.Color:
      // 这些是Cesium内置类型，不需要自定义属性类
      return options.color
    default:
      console.warn(`不支持的材质类型: ${materialType}`)
      return options
  }
}

/**
 * 获取所有支持的自定义材质类型
 * @returns {Array<string>} 支持的自定义材质类型数组
 */
export function getSupportedCustomMaterialTypes() {
  return [
    MATERIAL_TYPES.PolylineDynamicTexture,
    MATERIAL_TYPES.PolylineFlyLine,
    MATERIAL_TYPES.PolylinePulseLine,
  ]
}

/**
 * 检查材质类型是否为自定义类型
 * @param {string} materialType - 材质类型
 * @returns {boolean} 是否为自定义材质类型
 */
export function isCustomMaterialType(materialType) {
  return getSupportedCustomMaterialTypes().includes(materialType)
}

/**
 * 获取材质类型的默认配置
 * @param {string} materialType - 材质类型
 * @returns {Object} 默认配置对象
 */
export function getDefaultMaterialOptions(materialType) {
  switch (materialType) {
    case MATERIAL_TYPES.PolylineDynamicTexture:
      return {
        color: new window.Cesium.Color(1.0, 0.6, 0.2, 0.8),
        speed: 1.5,
      }

    case MATERIAL_TYPES.PolylineFlyLine:
      return {
        color: new window.Cesium.Color(0.0, 1.0, 1.0, 0.8),
        speed: 2.0,
        percent: 0.1,
        gradient: 0.1,
      }

    case MATERIAL_TYPES.PolylinePulseLine:
      return {
        color: new window.Cesium.Color(1.0, 0.5, 0.0, 0.9),
        speed: 1.5,
        pulseWidth: 0.2,
      }

    default:
      return {}
  }
}
