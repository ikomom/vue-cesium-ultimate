import { MATERIAL_TYPES } from '../../constanst'
import { DynamicTextureShader } from '../shaders'
import { addMaterial } from '../../utils/map'

const defaultImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAAgCAYAAABkS8DlAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAADSSURBVHja7NYxEoUgDEDBYM39z2qHtZViwMFxt1FJnF/98ZXWWkRE7LWWOOt5Lsm9q/vsbu9Zdtazs/J19O5bs1XPZrwze/6V31zxbOZs1n905Wt2p3f25GzE7ohv6q3nLQCA3xEAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAA8g4AAAD//wMA4WEFTJOT5UIAAAAASUVORK5CYII='
const defaultColor = 'red'
const defaultSpeed = 6

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
    this.time = performance.now()

    this.color = window.Cesium.Color.fromCssColorString(options.color || defaultColor)
    this.speed = options.speed || defaultSpeed
    this.image = options.image || defaultImage
  }

  getType() {
    return MATERIAL_TYPES.PolylineDynamicTexture
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
    result.speed = window.Cesium.Property.getValueOrClonedDefault(
      this._speed,
      time,
      defaultSpeed,
      result.speed,
    )

    result.time = performance.now() - this.time / 2

    return result
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
    return (
      window.Cesium.Property.isConstant(this._color) &&
      window.Cesium.Property.isConstant(this._speed)
    )
  }
}
export function initDynamicTextureMaterialProperty() {
  // 检查是否已经定义过属性，避免重复定义
  if (!DynamicTextureMaterialProperty.prototype.hasOwnProperty('color')) {
    Object.defineProperties(DynamicTextureMaterialProperty.prototype, {
      color: window.Cesium.createPropertyDescriptor('color'),
    speed: window.Cesium.createPropertyDescriptor('speed'),
    })
  }
  
  const type = DynamicTextureMaterialProperty.prototype.getType()
  addMaterial(type, {
    translucent: true,
    fabric: {
      type,
      uniforms: {
        color: new window.Cesium.Color.fromCssColorString(defaultColor),
        speed: defaultSpeed,
        image: defaultImage,
        time: performance.now(),
      },
      source: DynamicTextureShader,
    },
  })
}
