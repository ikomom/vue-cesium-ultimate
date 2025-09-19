/**
 * Mars3D 图形类型定义
 * @module GraphicType
 */

/**
 * 图形类型枚举
 */
export const GraphicType = {
  // 基础图形
  POINT: 'point',
  POLYLINE: 'polyline', 
  POLYGON: 'polygon',
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  
  // 3D图形
  BOX: 'box',
  CYLINDER: 'cylinder',
  SPHERE: 'sphere',
  CONE: 'cone',
  PYRAMID: 'pyramid',
  
  // 标注图形
  LABEL: 'label',
  BILLBOARD: 'billboard',
  MODEL: 'model',
  
  // 测量图形
  MEASURE_DISTANCE: 'measureDistance',
  MEASURE_AREA: 'measureArea',
  MEASURE_HEIGHT: 'measureHeight',
  MEASURE_ANGLE: 'measureAngle',
  
  // 分析图形
  VIEWSHED: 'viewshed',
  PROFILE: 'profile',
  FLOOD: 'flood',
  
  // 特效图形
  PARTICLE: 'particle',
  TRAIL: 'trail',
  DYNAMIC_RIVER: 'dynamicRiver',
  
  // 自定义图形
  CUSTOM: 'custom'
};

/**
 * 图形类型工具类
 */
export class GraphicTypeUtil {
  /**
   * 获取所有图形类型
   * @returns {string[]} 图形类型数组
   */
  static getAllTypes() {
    return Object.values(GraphicType);
  }
  
  /**
   * 检查是否为有效的图形类型
   * @param {string} type - 图形类型
   * @returns {boolean} 是否有效
   */
  static isValidType(type) {
    return Object.values(GraphicType).includes(type);
  }
  
  /**
   * 获取图形类型的显示名称
   * @param {string} type - 图形类型
   * @returns {string} 显示名称
   */
  static getDisplayName(type) {
    const names = {
      [GraphicType.POINT]: '点',
      [GraphicType.POLYLINE]: '线',
      [GraphicType.POLYGON]: '面',
      [GraphicType.CIRCLE]: '圆',
      [GraphicType.RECTANGLE]: '矩形',
      [GraphicType.ELLIPSE]: '椭圆',
      [GraphicType.BOX]: '立方体',
      [GraphicType.CYLINDER]: '圆柱体',
      [GraphicType.SPHERE]: '球体',
      [GraphicType.CONE]: '圆锥体',
      [GraphicType.PYRAMID]: '金字塔',
      [GraphicType.LABEL]: '标签',
      [GraphicType.BILLBOARD]: '广告牌',
      [GraphicType.MODEL]: '模型',
      [GraphicType.MEASURE_DISTANCE]: '距离测量',
      [GraphicType.MEASURE_AREA]: '面积测量',
      [GraphicType.MEASURE_HEIGHT]: '高度测量',
      [GraphicType.MEASURE_ANGLE]: '角度测量',
      [GraphicType.VIEWSHED]: '视域分析',
      [GraphicType.PROFILE]: '剖面分析',
      [GraphicType.FLOOD]: '淹没分析',
      [GraphicType.PARTICLE]: '粒子效果',
      [GraphicType.TRAIL]: '轨迹',
      [GraphicType.DYNAMIC_RIVER]: '动态河流',
      [GraphicType.CUSTOM]: '自定义'
    };
    
    return names[type] || type;
  }
  
  /**
   * 根据类型获取图形分类
   * @param {string} type - 图形类型
   * @returns {string} 图形分类
   */
  static getCategory(type) {
    const basic = [GraphicType.POINT, GraphicType.POLYLINE, GraphicType.POLYGON, GraphicType.CIRCLE, GraphicType.RECTANGLE, GraphicType.ELLIPSE];
    const threeD = [GraphicType.BOX, GraphicType.CYLINDER, GraphicType.SPHERE, GraphicType.CONE, GraphicType.PYRAMID];
    const annotation = [GraphicType.LABEL, GraphicType.BILLBOARD, GraphicType.MODEL];
    const measure = [GraphicType.MEASURE_DISTANCE, GraphicType.MEASURE_AREA, GraphicType.MEASURE_HEIGHT, GraphicType.MEASURE_ANGLE];
    const analysis = [GraphicType.VIEWSHED, GraphicType.PROFILE, GraphicType.FLOOD];
    const effect = [GraphicType.PARTICLE, GraphicType.TRAIL, GraphicType.DYNAMIC_RIVER];
    
    if (basic.includes(type)) return 'basic';
    if (threeD.includes(type)) return '3d';
    if (annotation.includes(type)) return 'annotation';
    if (measure.includes(type)) return 'measure';
    if (analysis.includes(type)) return 'analysis';
    if (effect.includes(type)) return 'effect';
    
    return 'custom';
  }
}

// 默认导出
export default GraphicType;