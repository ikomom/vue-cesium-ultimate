import { MATERIAL_TYPES } from '../../constanst'
import { ParabolaFlyLineShader } from '../shaders'
import { addMaterial } from '../../utils/map'

const defaultColor = 'cyan'
const defaultSpeed = 2.0
const defaultPercent = 0.1
const defaultGradient = 0.1

/**
 * 抛物线飞线材质属性
 * 类似于 PolylineTrailMaterialProperty
 */
export class ParabolaFlyLineMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._speed = undefined
    this._speedSubscription = undefined
    this._percent = undefined
    this._percentSubscription = undefined
    this._gradient = undefined
    this._gradientSubscription = undefined

    this.color = new window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.speed = options.speed || defaultSpeed
    this.percent = options.percent || defaultPercent
    this.gradient = options.gradient || defaultGradient
  }

  /**
   * 获取材质类型
   */
  getType() {
    return MATERIAL_TYPES.PolylineFlyLine
  }

  /**
   * 获取材质值
   */
  getValue(time, result) {
    if (!window.Cesium.defined(result)) {
      result = {}
    }

    result.color = this._getPropertyValue(
      this._color,
      time,
      window.Cesium.Color.fromCssColorString(defaultColor),
    )
    result.speed = this._getPropertyValue(this._speed, time, defaultSpeed)
    result.percent = this._getPropertyValue(this._percent, time, defaultPercent)
    result.gradient = this._getPropertyValue(this._gradient, time, defaultGradient)

    return result
  }

  _getPropertyValue(property, time, defaultValue) {
    const Cesium = window.Cesium
    if (window.Cesium.defined(property) && typeof property.getValue === 'function') {
      return property.getValue(time) || defaultValue
    }
    return property !== undefined ? property : defaultValue
  }

  /**
   * 比较两个属性是否相等
   */
  equals(other) {
    if (this === other) {
      return true
    }
    if (!(other instanceof ParabolaFlyLineMaterialProperty)) {
      return false
    }
    return (
      this._compareProperty(this._color, other._color) &&
      this._compareProperty(this._speed, other._speed) &&
      this._compareProperty(this._percent, other._percent) &&
      this._compareProperty(this._gradient, other._gradient)
    )
  }

  _compareProperty(a, b) {
    const Cesium = window.Cesium
    // 如果两个都是 Property 对象，使用 Cesium.Property.equals
    if (
      window.Cesium.defined(a) &&
    window.Cesium.defined(a.equals) &&
    window.Cesium.defined(b) &&
    window.Cesium.defined(b.equals)
    ) {
      return window.Cesium.Property.equals(a, b)
    }
    // 否则直接比较值
    return a === b
  }

  /**
   * 定义变化事件
   */
  get definitionChanged() {
    return this._definitionChanged
  }

  /**
   * 是否为常量
   */
  get isConstant() {
    return (
      window.Cesium.Property.isConstant(this._color) &&
    window.Cesium.Property.isConstant(this._speed) &&
    window.Cesium.Property.isConstant(this._percent) &&
    window.Cesium.Property.isConstant(this._gradient)
    )
  }
}

export function initParabolaFlyLineMaterialProperty() {
  // 检查是否已经定义过属性，避免重复定义
  if (!ParabolaFlyLineMaterialProperty.prototype.hasOwnProperty('color')) {
    Object.defineProperties(ParabolaFlyLineMaterialProperty.prototype, {
      color: window.Cesium.createPropertyDescriptor('color'),
      speed: window.Cesium.createPropertyDescriptor('speed'),
      percent: window.Cesium.createPropertyDescriptor('percent'),
      gradient: window.Cesium.createPropertyDescriptor('gradient'),
    })
  }

  const type = ParabolaFlyLineMaterialProperty.prototype.getType()
  addMaterial(type, {
    translucent: true,
    fabric: {
      type,
      uniforms: {
        color: window.Cesium.Color.fromCssColorString(defaultColor),
        speed: defaultSpeed,
        percent: defaultPercent,
        gradient: defaultGradient,
      },
      source: ParabolaFlyLineShader,
    },
  })
}
