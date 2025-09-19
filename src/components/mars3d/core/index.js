/**
 * Mars3D 核心模块
 * @module core
 */

// 导出类型定义
export * from './types.js';

// 导出常量
export * from './constants.js';

// 导出工具函数
export * from './util.js';

// 导出Cesium工具类
export { CesiumUtil } from './CesiumUtil.js';

// 重新导出常用的类和函数
export {
  EventType,
  GraphicType,
  LayerType,
  ControlType,
  EffectType,
  MaterialType,
  EditPointType,
  MoveType,
  State,
  ClipType,
  QueryServiceType,
  QueryRouteType,
  ThingType
} from './types.js';

export {
  version,
  name,
  author,
  website,
  update,
  DEFAULT_STYLES,
  MEASURE_STYLES,
  CRS_CONFIG,
  ELLIPSOID_CONFIG,
  DEFAULT_CONFIG,
  UNIT_CONFIG
} from './constants.js';

export {
  Util,
  PointUtil,
  FormatUtil,
  ColorUtil,
  isEmpty,
  clone,
  merge,
  uuid,
  toRadians,
  toDegrees,
  getAttrVal,
  setAttrVal,
  debounce,
  throttle,
  fromDegrees,
  pointToDegrees,
  distance,
  distanceToLine,
  getOnLinePointByRatio,
  getCenterOfMass,
  area,
  formatDistance,
  formatArea,
  formatAngle,
  fromHex,
  fromRgb,
  toHex
} from './util.js';