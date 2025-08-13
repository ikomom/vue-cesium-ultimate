import { MATERIAL_TYPES } from '../../constanst'
import { DynamicTextureShader } from '../shaders'
import { addMaterial } from '../../utils/map'

const defaultImage =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAAgCAYAAABkS8DlAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAADSSURBVHja7NYxEoUgDEDBYM39z2qHtZViwMFxt1FJnF/98ZXWWkRE7LWWOOt5Lsm9q/vsbu9Zdtazs/J19O5bs1XPZrwze/6V31zxbOZs1n905Wt2p3f25GzE7ohv6q3nLQCA3xEAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAA8g4AAAD//wMA4WEFTJOT5UIAAAAASUVORK5CYII='

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
    this.image = options.image || defaultImage

    addMaterial(this.getType(), {
      translucent: true,
      fabric: {
        type: this.getType(),
        uniforms: {
          color: this.color,
          speed: this.speed,
          image: this.image,
        },
        source: DynamicTextureShader,
      },
    })
  }

  getType() {
    return MATERIAL_TYPES.PolylineDynamicTexture
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
