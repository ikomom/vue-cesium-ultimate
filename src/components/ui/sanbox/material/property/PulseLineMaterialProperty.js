import { MATERIAL_TYPES } from '../../constanst'
import { AdvancedPulseLineShader } from '../shaders'
import { addMaterial } from '../../utils/map'

const defaultColor = 'blue'
const defaultSpeed = 1.5
const defaultPulseWidth = 0.2

/**
 * 脉冲线材质属性
 */
export class PulseLineMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._speed = undefined
    this._speedSubscription = undefined
    this._pulseWidth = undefined
    this._pulseWidthSubscription = undefined

    this.color = new window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.speed = options.speed || defaultSpeed
    this.pulseWidth = options.pulseWidth || defaultPulseWidth
  }

  getType() {
    return MATERIAL_TYPES.PolylinePulseLine
  }

  getValue(time, result) {
    const Cesium = window.Cesium
    if (!window.Cesium.defined(result)) {
      result = {}
    }

    result.color = this._getPropertyValue(
      this._color,
      time,
      window.Cesium.Color.fromCssColorString(defaultColor),
    )
    result.speed = this._getPropertyValue(this._speed, time, defaultSpeed)
    result.pulseWidth = this._getPropertyValue(this._pulseWidth, time, defaultPulseWidth)

    return result
  }

  _getPropertyValue(property, time, defaultValue) {
    const Cesium = window.Cesium
    if (window.Cesium.defined(property) && typeof property.getValue === 'function') {
      return property.getValue(time) || defaultValue
    }
    return property !== undefined ? property : defaultValue
  }

  equals(other) {
    if (this === other) {
      return true
    }
    if (!(other instanceof PulseLineMaterialProperty)) {
      return false
    }
    return (
      this._compareProperty(this._color, other._color) &&
      this._compareProperty(this._speed, other._speed) &&
      this._compareProperty(this._pulseWidth, other._pulseWidth)
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

  get definitionChanged() {
    return this._definitionChanged
  }

  get isConstant() {
    return (
      window.Cesium.Property.isConstant(this._color) &&
    window.Cesium.Property.isConstant(this._speed) &&
    window.Cesium.Property.isConstant(this._pulseWidth)
    )
  }
}

export function initPulseLineMaterialProperty() {
  // 检查是否已经定义过属性，避免重复定义
  if (!PulseLineMaterialProperty.prototype.hasOwnProperty('color')) {
    Object.defineProperties(PulseLineMaterialProperty.prototype, {
      color: window.Cesium.createPropertyDescriptor('color'),
      speed: window.Cesium.createPropertyDescriptor('speed'),
      pulseWidth: window.Cesium.createPropertyDescriptor('pulseWidth'),
    })
  }

  const type = PulseLineMaterialProperty.prototype.getType()
  addMaterial(type, {
    translucent: true,
    fabric: {
      type,
      uniforms: {
        color: window.Cesium.Color.fromCssColorString(defaultColor),
        speed: defaultSpeed,
        pulseWidth: defaultPulseWidth,
      },
      source: AdvancedPulseLineShader,
    },
  })
}
