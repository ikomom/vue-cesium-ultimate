import { MATERIAL_TYPES } from '../../constanst'
import { DynamicTextureShader, PolylineTrailLinkShader } from '../shaders'
import { addMaterial } from '../../utils/map'
import color3Image from '@/assets/material/colors3.png'
import { getCurrentZoomLevel } from '@/utils'

const defaultImage = color3Image
const defaultColor = 'red'
const defaultDuration = 14000
const defaultRepeat = 1.0

/**
 * 动态纹理材质属性
 */
export class PolylineTrailLinkMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new window.Cesium.Event()
    this._color = undefined
    this._colorSubscription = undefined
    this._time = new Date().getTime()

    this.image = options.image || defaultImage
    this.color = window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.duration = options.duration || defaultDuration
    this.repeat = options.repeat || defaultRepeat
    // 纹理重复的基准长度（米），用于计算合适的repeat值
    this.baseLength = options.baseLength || 100000 // 默认100km
    this._polyline = options.polyline // 保存polyline引用用于计算长度
  }

  getType() {
    return MATERIAL_TYPES.PolylineTrailLink
  }

  getValue(time, result) {
    if (!window.Cesium.defined(result)) {
      result = {}
    }
    result.image = this.image
    result.color = window.Cesium.Property.getValueOrClonedDefault(
        this._color,
        time,
        window.Cesium.Color.fromCssColorString(defaultColor),
      result.color,
    )

    result.time = ((new Date().getTime() - this._time) % this.duration) / this.duration

    // 动态计算repeat值以保持纹理比例
    // let calculatedRepeat = this.repeat
    // if (this._polyline && this._polyline.positions) {
    //   try {
    //     const positions = this._polyline.positions.getValue ?
    //       this._polyline.positions.getValue(time) : this._polyline.positions
    //     if (positions && positions.length >= 2) {
    //       // 计算线段总长度
    //       let totalLength = 0
    //       for (let i = 1; i < positions.length; i++) {
    //         const distance = window.Cesium.Cartesian3.distance(positions[i-1], positions[i])
    //         totalLength += distance
    //       }
    //       // 根据线段长度调整repeat值，保持纹理密度一致
    //       calculatedRepeat = Math.max(1, totalLength / this.baseLength)
    //     }
    //   } catch (error) {
    //     // 如果计算失败，使用默认值
    //     calculatedRepeat = this.repeat
    //   }
    // }

    //TDOO: 算的不准 分段函数计算repeat：10以下线性增长，10以上指数增长
    const zoomLevel = getCurrentZoomLevel(window.viewer)
    let repeat = 1
    if (zoomLevel < 8) {
      // 10以下：线性增长 y = x
      repeat = Math.max(1, zoomLevel)
    } else {
      // 10以上：指数增长 y = 10 + (x-10)²
      repeat = Math.pow(zoomLevel, 2) + zoomLevel * 6
    }
    result.repeat = repeat
    // console.log('ZoomLevel:', zoomLevel, 'Repeat:', result.repeat)

    // debugger
    // console.log('repeat:', calculatedRepeat, 'polyline:', this._polyline)

    return result
  }

  equals(other) {
    if (this === other) {
      return true
    }
    if (!(other instanceof PolylineTrailLinkMaterialProperty)) {
      return false
    }
    return this._compareProperty(this._color, other._color)
  }

  _compareProperty(a, b) {
    const Cesium = window.Cesium
    if (
      window.Cesium.defined(a) &&
    window.Cesium.defined(a.equals) &&
    window.Cesium.defined(b) &&
    window.Cesium.defined(b.equals)
    ) {
      return window.Cesium.Property.equals(a, b)
    }
    return a === b
  }

  get definitionChanged() {
    return this._definitionChanged
  }

  get isConstant() {
    return window.Cesium.Property.isConstant(this._color)
  }
}
export function initPolylineTrailLinkMaterialProperty() {
  // 检查是否已经定义过属性，避免重复定义
  if (!PolylineTrailLinkMaterialProperty.prototype.hasOwnProperty('color')) {
    Object.defineProperties(PolylineTrailLinkMaterialProperty.prototype, {
      color: window.Cesium.createPropertyDescriptor('color'),
    })
  }

  const type = PolylineTrailLinkMaterialProperty.prototype.getType()
  addMaterial(type, {
    translucent: true,
    fabric: {
      type,
      uniforms: {
        image: defaultImage,
        color: new window.Cesium.Color.fromCssColorString(defaultColor),
        time: 0,
        repeat: defaultRepeat,
        // speed: 1,
      },
      source: PolylineTrailLinkShader,
      // source: DynamicTextureShader,
    },
  })
}
