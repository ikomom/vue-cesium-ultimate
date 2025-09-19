/**
 * Mars3D 核心类型定义
 * @module core/types
 */

// 事件类型枚举
export const EventType = {
  // 绘制相关事件
  drawStart: 'drawStart',
  drawAddPoint: 'drawAddPoint',
  drawRemovePoint: 'drawRemovePoint',
  drawMouseMove: 'drawMouseMove',
  drawCreated: 'drawCreated',
  
  // 编辑相关事件
  editStart: 'editStart',
  editMovePoint: 'editMovePoint',
  editRemovePoint: 'editRemovePoint',
  editMouseMove: 'editMouseMove',
  editStop: 'editStop',
  
  // 通用事件
  change: 'change',
  start: 'start',
  end: 'end',
  click: 'click',
  rightClick: 'rightClick',
  mouseOver: 'mouseOver',
  mouseOut: 'mouseOut',
  
  // 图层事件
  add: 'add',
  remove: 'remove',
  show: 'show',
  hide: 'hide',
  load: 'load',
  loadError: 'loadError'
};

// 图形类型枚举
export const GraphicType = {
  point: 'point',
  polyline: 'polyline',
  polygon: 'polygon',
  rectangle: 'rectangle',
  circle: 'circle',
  ellipse: 'ellipse',
  billboard: 'billboard',
  label: 'label',
  model: 'model',
  primitive: 'primitive',
  tileset: 'tileset',
  
  // 测量类型
  distanceMeasure: 'distanceMeasure',
  areaMeasure: 'areaMeasure',
  heightMeasure: 'heightMeasure',
  angleMeasure: 'angleMeasure'
};

// 图层类型枚举
export const LayerType = {
  group: 'group',
  graphic: 'graphic',
  geojson: 'geojson',
  kml: 'kml',
  czml: 'czml',
  gltf: 'gltf',
  tileset: 'tileset',
  terrain: 'terrain',
  imagery: 'imagery',
  xyz: 'xyz',
  wmts: 'wmts',
  wms: 'wms',
  arcgis: 'arcgis',
  baidu: 'baidu',
  gaode: 'gaode',
  tencent: 'tencent',
  tianditu: 'tianditu'
};

// 控制类型枚举
export const ControlType = {
  toolbar: 'toolbar',
  compass: 'compass',
  zoom: 'zoom',
  scaleBar: 'scaleBar',
  distanceLegend: 'distanceLegend',
  locationBar: 'locationBar',
  mouseDownView: 'mouseDownView',
  contextMenu: 'contextMenu'
};

// 效果类型枚举
export const EffectType = {
  bloom: 'bloom',
  brightness: 'brightness',
  night: 'night',
  blackAndWhite: 'blackAndWhite',
  rain: 'rain',
  snow: 'snow',
  fog: 'fog'
};

// 材质类型枚举
export const MaterialType = {
  color: 'Color',
  image: 'Image',
  grid: 'Grid',
  stripe: 'Stripe',
  checkerboard: 'Checkerboard',
  dot: 'Dot',
  water: 'Water',
  normalMap: 'NormalMap',
  rimLighting: 'RimLighting',
  fresnel: 'Fresnel'
};

// 编辑点类型枚举
export const EditPointType = {
  control: 'control',
  midpoint: 'midpoint',
  auxiliary: 'auxiliary'
};

// 移动类型枚举
export const MoveType = {
  stepForward: 'stepForward',
  stepBackward: 'stepBackward',
  stepUp: 'stepUp',
  stepDown: 'stepDown',
  stepLeft: 'stepLeft',
  stepRight: 'stepRight'
};

// 状态枚举
export const State = {
  initialized: 'initialized',
  loading: 'loading',
  loaded: 'loaded',
  failed: 'failed',
  destroyed: 'destroyed'
};

// 裁剪类型枚举
export const ClipType = {
  clipOutside: 0,
  clipInside: 1
};

// 查询服务类型枚举
export const QueryServiceType = {
  arcgis: 'arcgis',
  wfs: 'wfs',
  wms: 'wms'
};

// 路径查询类型枚举
export const QueryRouteType = {
  gaode: 'gaode',
  baidu: 'baidu',
  osrm: 'osrm'
};

// Thing类型枚举
export const ThingType = {
  unknown: 'unknown',
  graphic: 'graphic',
  layer: 'layer',
  control: 'control',
  widget: 'widget'
};