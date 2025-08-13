import { MATERIAL_TYPES } from '../../constanst'
import { PulseLineShader } from '../shaders'
import { addMaterial } from '../../utils/map'

/**
 * 脉冲线材质属性
 */
export class PulseLineMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._speed = undefined
    this._speedSubscription = undefined
    this._pulseWidth = undefined
    this._pulseWidthSubscription = undefined

    this.color = options.color || new Cesium.Color(1.0, 0.5, 0.0, 0.9)
    this.speed = options.speed || 1.5
    this.pulseWidth = options.pulseWidth || 0.2

    addMaterial(this.getType(), {
      translucent: true,
      fabric: {
        type: this.getType(),
        uniforms: {
          color: this.color,
          speed: this.speed,
          pulseWidth: this.pulseWidth,
        },
        source: PulseLineShader,
      },
    })
  }

  getType() {
    return MATERIAL_TYPES.PolylinePulseLine
  }

  getValue(time, result) {
    const Cesium = window.Cesium
    if (!Cesium.defined(result)) {
      result = {}
    }

    result.color = this._getPropertyValue(this._color, time, Cesium.Color.WHITE)
    result.speed = this._getPropertyValue(this._speed, time, 1.5)
    result.pulseWidth = this._getPropertyValue(this._pulseWidth, time, 0.2)

    return result
  }

  _getPropertyValue(property, time, defaultValue) {
    const Cesium = window.Cesium
    if (Cesium.defined(property) && typeof property.getValue === 'function') {
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
      Cesium.defined(a) &&
      Cesium.defined(a.equals) &&
      Cesium.defined(b) &&
      Cesium.defined(b.equals)
    ) {
      return Cesium.Property.equals(a, b)
    }
    // 否则直接比较值
    return a === b
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  get isConstant() {
    return (
      Cesium.Property.isConstant(this._color) &&
      Cesium.Property.isConstant(this._speed) &&
      Cesium.Property.isConstant(this._pulseWidth)
    )
  }

  get color() {
    return this._color
  }

  set color(value) {
    if (this._colorSubscription) {
      this._colorSubscription()
      this._colorSubscription = undefined
    }

    this._color = value

    if (Cesium.defined(value) && value.definitionChanged) {
      this._colorSubscription = value.definitionChanged.addEventListener(() =>
        this._definitionChanged.raiseEvent(this),
      )
    }

    this._definitionChanged.raiseEvent(this)
  }

  get speed() {
    return this._speed
  }

  set speed(value) {
    if (this._speedSubscription) {
      this._speedSubscription()
      this._speedSubscription = undefined
    }

    this._speed = value

    if (Cesium.defined(value) && value.definitionChanged) {
      this._speedSubscription = value.definitionChanged.addEventListener(() =>
        this._definitionChanged.raiseEvent(this),
      )
    }

    this._definitionChanged.raiseEvent(this)
  }

  get pulseWidth() {
    return this._pulseWidth
  }

  set pulseWidth(value) {
    if (this._pulseWidthSubscription) {
      this._pulseWidthSubscription()
      this._pulseWidthSubscription = undefined
    }

    this._pulseWidth = value

    if (Cesium.defined(value) && value.definitionChanged) {
      this._pulseWidthSubscription = value.definitionChanged.addEventListener(() =>
        this._definitionChanged.raiseEvent(this),
      )
    }

    this._definitionChanged.raiseEvent(this)
  }
}
