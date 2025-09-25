import { MATERIAL_TYPES } from '../../constanst.js'
import { addMaterial } from '../../utils/map.js'

const defaultColor = 'cyan'
const defaultOpacityDefault = 0.4  // 默认透明度
const defaultOpacityOnClick = 0.9  // 点击时透明度
const defaultWidth = 5.0

/**
 * 条件透明度连线材质属性
 * 根据点击状态动态调整透明度
 */
export class ConditionalOpacityLineMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._width = undefined
    this._widthSubscription = undefined
    this._isClicked = false
    this._opacityDefault = undefined
    this._opacityOnClick = undefined
    this._lastOpacity = undefined // 缓存上次计算的透明度，避免重复计算
    this._lastClickState = false // 缓存上次的点击状态

    // 基础属性
    this._baseColor = new window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.width = options.width || defaultWidth

    // 透明度配置
    this.opacityDefault = options.opacityDefault || defaultOpacityDefault
    this.opacityOnClick = options.opacityOnClick || defaultOpacityOnClick

    // 点击状态
    this.isClicked = options.isClicked || false

    // 使用CallbackProperty实现动态颜色（包含透明度）
    this.color = new window.Cesium.CallbackProperty((time, result) => {
      return this._calculateDynamicColor(time, result)
    }, false) // false表示不是常量，会随时间变化
  }

  /**
   * 获取材质类型
   */
  getType() {
    return MATERIAL_TYPES.POLYLINE_CONDITIONAL_OPACITY || 'PolylineConditionalOpacity'
  }

  /**
   * 获取材质值
   */
  getValue(time, result) {
    if (!window.Cesium.defined(result)) {
      result = {}
    }

    // 使用CallbackProperty的动态颜色
    result.color = this.color.getValue(time)
    result.width = this._getPropertyValue(this._width, time, this.width)

    return result
  }

  /**
   * 计算动态颜色（包含透明度）
   * @param {JulianDate} time - 当前时间
   * @param {Color} result - 结果颜色对象
   * @returns {Color} 计算后的颜色
   */
  _calculateDynamicColor(time, result) {
    if (!result) {
      result = new window.Cesium.Color()
    }

    // 复制基础颜色
    window.Cesium.Color.clone(this._baseColor, result)

    // 计算透明度，根据点击状态决定
    let opacity = this.isClicked ? this.opacityOnClick : this.opacityDefault

    // 检查点击状态是否变化
    if (this.isClicked !== this._lastClickState) {
      this._lastClickState = this.isClicked
      console.log('[ConditionalOpacityLineMaterialProperty] 点击状态变化:', this.isClicked, '透明度变为:', opacity)
    }

    // 确保透明度值在有效范围内 (0.2-1)
    opacity = Math.max(0.2, Math.min(1.0, opacity))

    // 缓存透明度值
    this._lastOpacity = opacity

    // 设置透明度
    result.alpha = opacity
    
    return result
  }

  /**
   * 设置点击状态
   * @param {boolean} clicked - 是否被点击
   */
  setClicked(clicked) {
    if (this.isClicked === clicked) {
      return // 状态没有变化，直接返回
    }
    
    this.isClicked = clicked
    console.log('[ConditionalOpacityLineMaterialProperty] 点击状态变化:', clicked)
    
    // 触发定义变化事件
    this._definitionChanged.raiseEvent(this)
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
    if (!(other instanceof ConditionalOpacityLineMaterialProperty)) {
      return false
    }
    return (
      this._compareProperty(this._color, other._color) &&
      this._compareProperty(this._width, other._width) &&
      this.isClicked === other.isClicked &&
      this.opacityDefault === other.opacityDefault &&
      this.opacityOnClick === other.opacityOnClick
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
      window.Cesium.Property.isConstant(this._width) &&
      !this.isClicked // 如果被点击，则不是常量
    )
  }
}

/**
 * 初始化条件透明度连线材质属性
 */
export function initConditionalOpacityLineMaterialProperty() {
  // 检查是否已经定义过属性，避免重复定义
  if (!ConditionalOpacityLineMaterialProperty.prototype.hasOwnProperty('color')) {
    Object.defineProperties(ConditionalOpacityLineMaterialProperty.prototype, {
      color: window.Cesium.createPropertyDescriptor('color'),
      width: window.Cesium.createPropertyDescriptor('width'),
      opacityDefault: window.Cesium.createPropertyDescriptor('opacityDefault'),
      opacityOnClick: window.Cesium.createPropertyDescriptor('opacityOnClick'),
    })
  }

  const type = ConditionalOpacityLineMaterialProperty.prototype.getType()

  // 添加材质到Cesium
  addMaterial(type, {
    translucent: true,
    fabric: {
      type,
      uniforms: {
        color: window.Cesium.Color.fromCssColorString(defaultColor).withAlpha(defaultOpacityDefault),
        width: defaultWidth,
      },
      // 使用简单的颜色材质，透明度通过color的alpha通道控制
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          material.diffuse = color.rgb;
          material.alpha = color.a;
          return material;
        }
      `,
    },
  })
}
