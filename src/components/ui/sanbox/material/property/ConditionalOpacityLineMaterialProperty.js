import { MATERIAL_TYPES } from '../../constanst.js'
import { addMaterial } from '../../utils/map.js'

const defaultColor = 'cyan'
const defaultOpacityInRange = 0.7
const defaultOpacityOutRange = 0.4  // 提高默认透明度，避免过于透明
const defaultOpacityOnClick = 0.9
const defaultWidth = 5.0

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
    this._lastLogTime = undefined // 用于控制日志输出频率
    this._lastOpacity = undefined // 缓存上次计算的透明度，避免重复计算
    this._lastClickState = false // 缓存上次的点击状态

    // 基础属性
    this._baseColor = new window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.width = options.width || defaultWidth

    // 透明度配置
    this.opacityInRange = options.opacityInRange || defaultOpacityInRange
    this.opacityOutRange = options.opacityOutRange || defaultOpacityOutRange
    this.opacityOnClick = options.opacityOnClick || defaultOpacityOnClick

    // 时间范围配置 { start: JulianDate, end: JulianDate }
    this.timeRange = options.timeRange || null

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

    // 计算透明度，确保始终有一个有效的初始值
    let opacity = this._lastOpacity !== undefined ? this._lastOpacity : this.opacityOutRange
    let needsUpdate = false

    // 检查点击状态是否变化
    if (this.isClicked !== this._lastClickState) {
      needsUpdate = true
      this._lastClickState = this.isClicked
      console.log('[ConditionalOpacityLineMaterialProperty] 点击状态变化:', this.isClicked, '透明度将变为:', this.isClicked ? this.opacityOnClick : '根据时间范围计算')
    }

    if (this.isClicked) {
      // 点击状态下使用点击透明度
      opacity = this.opacityOnClick
      console.log('[ConditionalOpacityLineMaterialProperty] 使用点击透明度:', opacity)
    } else if (this.timeRange && time) {
      // 检查时间是否在范围内
      const timeRange = this._getPropertyValue(this.timeRange, time, this.timeRange)
      
      if (timeRange && timeRange.start && timeRange.end) {
        const isInRange = window.Cesium.JulianDate.greaterThanOrEquals(time, timeRange.start) &&
                         window.Cesium.JulianDate.lessThanOrEquals(time, timeRange.end)
        
        opacity = isInRange ? this.opacityInRange : this.opacityOutRange
        
        // 只有透明度发生变化或需要更新时才输出日志
        if (needsUpdate || opacity !== this._lastOpacity) {
          if (this._lastLogTime === undefined || 
              window.Cesium.JulianDate.secondsDifference(time, this._lastLogTime) > 1) {
            console.log('[ConditionalOpacityLineMaterialProperty] 时间范围检查:', {
              currentTime: window.Cesium.JulianDate.toIso8601(time),
              startTime: window.Cesium.JulianDate.toIso8601(timeRange.start),
              endTime: window.Cesium.JulianDate.toIso8601(timeRange.end),
              isInRange,
              opacity,
              changed: opacity !== this._lastOpacity
            })
            this._lastLogTime = window.Cesium.JulianDate.clone(time)
          }
        }
      } else {
        // 没有有效的时间范围时，使用范围外透明度
        opacity = this.opacityOutRange
      }
    } else {
      // 非点击状态且没有时间范围时，使用范围外透明度
      opacity = this.opacityOutRange
    }

    // 确保透明度值在有效范围内 (0-1)
    opacity = Math.max(0.2, Math.min(1.0, opacity)) // 提高最小透明度到0.2，确保更好的可见性

    // 缓存透明度值
    this._lastOpacity = opacity

    // 设置透明度
    result.alpha = opacity
    
    console.log('[ConditionalOpacityLineMaterialProperty] 最终透明度:', opacity, '点击状态:', this.isClicked)
    
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
    
    // 不需要重新创建回调函数，CallbackProperty会自动检测到状态变化
    // 只需要触发定义变化事件即可
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
