import { MATERIAL_TYPES } from '../../constanst.js'
import { addMaterial } from '../../utils/map.js'

const defaultColor = 'cyan'
const defaultOpacityInRange = 0.7
const defaultOpacityOutRange = 0.3
const defaultOpacityOnClick = 0.9
const defaultWidth = 2.0

/**
 * 条件透明度连线材质属性
 * 根据时间范围和点击状态动态调整透明度
 */
export class ConditionalOpacityLineMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._width = undefined
    this._widthSubscription = undefined
    this._timeRange = undefined
    this._timeRangeSubscription = undefined
    this._isClicked = false
    this._opacityInRange = undefined
    this._opacityOutRange = undefined
    this._opacityOnClick = undefined

    // 基础属性
    this.color = new window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.width = options.width || defaultWidth
    
    // 透明度配置
    this.opacityInRange = options.opacityInRange || defaultOpacityInRange
    this.opacityOutRange = options.opacityOutRange || defaultOpacityOutRange
    this.opacityOnClick = options.opacityOnClick || defaultOpacityOnClick
    
    // 时间范围配置 { start: JulianDate, end: JulianDate }
    this.timeRange = options.timeRange || null
    
    // 点击状态
    this.isClicked = options.isClicked || false
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

    // 获取基础颜色
    const baseColor = this._getPropertyValue(
      this._color,
      time,
      window.Cesium.Color.fromCssColorString(defaultColor)
    )

    // 计算当前透明度
    let currentOpacity = this.opacityOutRange

    // 如果被点击，使用点击透明度
    if (this.isClicked) {
      currentOpacity = this.opacityOnClick
    } else if (this.timeRange && time) {
      // 检查时间是否在范围内
      const timeRange = this._getPropertyValue(this._timeRange, time, this.timeRange)
      if (timeRange && timeRange.start && timeRange.end) {
        const currentTime = window.Cesium.JulianDate.toDate(time)
        const startTime = window.Cesium.JulianDate.toDate(timeRange.start)
        const endTime = window.Cesium.JulianDate.toDate(timeRange.end)
        
        if (currentTime >= startTime && currentTime <= endTime) {
          currentOpacity = this.opacityInRange
        }
      }
    }

    // 应用透明度到颜色
    result.color = baseColor.withAlpha(currentOpacity)
    result.width = this._getPropertyValue(this._width, time, defaultWidth)

    return result
  }

  /**
   * 设置点击状态
   * @param {boolean} clicked - 是否被点击
   */
  setClickedState(clicked) {
    this.isClicked = clicked
    this._definitionChanged.raiseEvent(this)
  }

  /**
   * 设置时间范围
   * @param {Object} timeRange - 时间范围 { start: JulianDate, end: JulianDate }
   */
  setTimeRange(timeRange) {
    this.timeRange = timeRange
    this._definitionChanged.raiseEvent(this)
  }

  /**
   * 检查当前时间是否在范围内
   * @param {JulianDate} time - 当前时间
   * @returns {boolean} 是否在时间范围内
   */
  isTimeInRange(time) {
    if (!this.timeRange || !time) {
      return false
    }
    
    const currentTime = window.Cesium.JulianDate.toDate(time)
    const startTime = window.Cesium.JulianDate.toDate(this.timeRange.start)
    const endTime = window.Cesium.JulianDate.toDate(this.timeRange.end)
    
    return currentTime >= startTime && currentTime <= endTime
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
      this._compareProperty(this._timeRange, other._timeRange) &&
      this.isClicked === other.isClicked &&
      this.opacityInRange === other.opacityInRange &&
      this.opacityOutRange === other.opacityOutRange &&
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
      window.Cesium.Property.isConstant(this._timeRange) &&
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
      timeRange: window.Cesium.createPropertyDescriptor('timeRange'),
      opacityInRange: window.Cesium.createPropertyDescriptor('opacityInRange'),
      opacityOutRange: window.Cesium.createPropertyDescriptor('opacityOutRange'),
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
        color: window.Cesium.Color.fromCssColorString(defaultColor).withAlpha(defaultOpacityOutRange),
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