/**
 * 自定义材质属性类
 * 基于 Cesium MaterialProperty 系统
 */

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

    this.color = options.color || new window.Cesium.Color(0.0, 1.0, 1.0, 0.8)
    this.speed = options.speed || 2.0
    this.percent = options.percent || 0.1
    this.gradient = options.gradient || 0.1
  }

  /**
   * 获取材质类型
   */
  getType() {
    return 'ParabolaFlyLine'
  }

  /**
   * 获取材质值
   */
  getValue(time, result) {
    if (!window.Cesium.defined(result)) {
      result = {}
    }

    result.color = this._getPropertyValue(this._color, time, window.Cesium.Color.WHITE)
    result.speed = this._getPropertyValue(this._speed, time, 2.0)
    result.percent = this._getPropertyValue(this._percent, time, 0.1)
    result.gradient = this._getPropertyValue(this._gradient, time, 0.1)

    return result
  }

  _getPropertyValue(property, time, defaultValue) {
    const Cesium = window.Cesium
    if (Cesium.defined(property) && typeof property.getValue === 'function') {
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
    const Cesium = window.Cesium
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
      Cesium.Property.isConstant(this._color) &&
      Cesium.Property.isConstant(this._speed) &&
      Cesium.Property.isConstant(this._percent) &&
      Cesium.Property.isConstant(this._gradient)
    )
  }

  /**
   * 颜色属性
   */
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

  /**
   * 速度属性
   */
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

  /**
   * 百分比属性
   */
  get percent() {
    return this._percent
  }

  set percent(value) {
    if (this._percentSubscription) {
      this._percentSubscription()
      this._percentSubscription = undefined
    }

    this._percent = value

    if (Cesium.defined(value) && value.definitionChanged) {
      this._percentSubscription = value.definitionChanged.addEventListener(() =>
        this._definitionChanged.raiseEvent(this),
      )
    }

    this._definitionChanged.raiseEvent(this)
  }

  /**
   * 渐变属性
   */
  get gradient() {
    return this._gradient
  }

  set gradient(value) {
    if (this._gradientSubscription) {
      this._gradientSubscription()
      this._gradientSubscription = undefined
    }

    this._gradient = value

    if (Cesium.defined(value) && value.definitionChanged) {
      this._gradientSubscription = value.definitionChanged.addEventListener(() =>
        this._definitionChanged.raiseEvent(this),
      )
    }

    this._definitionChanged.raiseEvent(this)
  }
}

/**
 * 动态纹理材质属性
 */
export class DynamicTextureMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._speed = undefined
    this._speedSubscription = undefined

    this.color = options.color || new window.Cesium.Color(1.0, 0.6, 0.2, 0.8)
    this.speed = options.speed || 1.5
  }

  getType() {
    return 'DynamicTexture'
  }

  getValue(time, result) {
    if (!window.Cesium.defined(result)) {
      result = {}
    }

    result.color = this._getPropertyValue(this._color, time, window.Cesium.Color.WHITE)
    result.speed = this._getPropertyValue(this._speed, time, 1.5)

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
    if (!(other instanceof DynamicTextureMaterialProperty)) {
      return false
    }
    return (
      this._compareProperty(this._color, other._color) &&
      this._compareProperty(this._speed, other._speed)
    )
  }

  _compareProperty(a, b) {
    const Cesium = window.Cesium
    if (
      Cesium.defined(a) &&
      Cesium.defined(a.equals) &&
      Cesium.defined(b) &&
      Cesium.defined(b.equals)
    ) {
      return Cesium.Property.equals(a, b)
    }
    return a === b
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  get isConstant() {
    return (
      window.Cesium.Property.isConstant(this._color) &&
      window.Cesium.Property.isConstant(this._speed)
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

    if (window.Cesium.defined(value) && typeof value.definitionChanged !== 'undefined') {
      this._colorSubscription = value.definitionChanged.addEventListener(() => {
        this._definitionChanged.raiseEvent(this)
      })
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

    if (window.Cesium.defined(value) && typeof value.definitionChanged !== 'undefined') {
      this._speedSubscription = value.definitionChanged.addEventListener(() => {
        this._definitionChanged.raiseEvent(this)
      })
    }

    this._definitionChanged.raiseEvent(this)
  }
}

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
  }

  getType() {
    return 'PulseLine'
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
    const Cesium = window.Cesium
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
