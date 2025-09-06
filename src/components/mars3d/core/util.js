/**
 * Mars3D 核心工具函数
 * @module core/util
 */

import * as Cesium from 'cesium';
import { UNIT_CONFIG } from './constants.js';

/**
 * 通用工具类
 */
export class Util {
  /**
   * 判断是否为空值
   * @param {*} val - 要判断的值
   * @returns {boolean} 是否为空
   */
  static isEmpty(val) {
    return val == null || val === '' || (Array.isArray(val) && val.length === 0);
  }

  /**
   * 深度克隆对象
   * @param {*} obj - 要克隆的对象
   * @returns {*} 克隆后的对象
   */
  static clone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.clone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.clone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  /**
   * 合并对象
   * @param {object} target - 目标对象
   * @param {...object} sources - 源对象
   * @returns {object} 合并后的对象
   */
  static merge(target, ...sources) {
    if (!target) target = {};
    sources.forEach(source => {
      if (source) {
        Object.keys(source).forEach(key => {
          if (source[key] !== undefined) {
            target[key] = source[key];
          }
        });
      }
    });
    return target;
  }

  /**
   * 生成唯一ID
   * @param {string} prefix - 前缀
   * @returns {string} 唯一ID
   */
  static uuid(prefix = 'mars3d') {
    return prefix + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 角度转弧度
   * @param {number} degrees - 角度值
   * @returns {number} 弧度值
   */
  static toRadians(degrees) {
    return Cesium.Math.toRadians(degrees);
  }

  /**
   * 弧度转角度
   * @param {number} radians - 弧度值
   * @returns {number} 角度值
   */
  static toDegrees(radians) {
    return Cesium.Math.toDegrees(radians);
  }

  /**
   * 计算多边形面积
   * @param {Array} positions - 位置数组
   * @returns {number} 面积（平方米）
   */
  static area(positions) {
    if (!positions || positions.length < 3) return 0;
    
    // 转换为Cartesian3坐标
    const cartesians = positions.map(pos => {
      if (Array.isArray(pos)) {
        return Cesium.Cartesian3.fromDegrees(pos[0], pos[1], pos[2] || 0);
      }
      return pos;
    });
    
    // 计算多边形面积
    const polygon = new Cesium.PolygonHierarchy(cartesians);
    return Cesium.PolygonGeometryLibrary.computeArea2D(polygon, Cesium.Ellipsoid.WGS84);
  }

  /**
   * 获取属性值（支持深层嵌套）
   * @param {object} obj - 对象
   * @param {string} path - 属性路径，如 'a.b.c'
   * @param {*} defaultValue - 默认值
   * @returns {*} 属性值
   */
  static getAttrVal(obj, path, defaultValue) {
    if (!obj || !path) return defaultValue;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  }

  /**
   * 设置属性值（支持深层嵌套）
   * @param {object} obj - 对象
   * @param {string} path - 属性路径，如 'a.b.c'
   * @param {*} value - 要设置的值
   */
  static setAttrVal(obj, path, value) {
    if (!obj || !path) return;
    
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 时间间隔（毫秒）
   * @returns {Function} 节流后的函数
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

/**
 * 点工具类
 */
export class PointUtil {
  /**
   * 经纬度转笛卡尔坐标
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @param {number} alt - 高度
   * @returns {Cesium.Cartesian3} 笛卡尔坐标
   */
  static fromDegrees(lng, lat, alt = 0) {
    return Cesium.Cartesian3.fromDegrees(lng, lat, alt);
  }

  /**
   * 笛卡尔坐标转经纬度
   * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
   * @returns {object} 经纬度对象 {lng, lat, alt}
   */
  static toDegrees(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      lng: Cesium.Math.toDegrees(cartographic.longitude),
      lat: Cesium.Math.toDegrees(cartographic.latitude),
      alt: cartographic.height
    };
  }

  /**
   * 计算两点间距离
   * @param {Cesium.Cartesian3} point1 - 点1
   * @param {Cesium.Cartesian3} point2 - 点2
   * @returns {number} 距离（米）
   */
  static distance(point1, point2) {
    return Cesium.Cartesian3.distance(point1, point2);
  }

  /**
   * 计算点到线的距离
   * @param {Cesium.Cartesian3} point - 点
   * @param {Cesium.Cartesian3} lineStart - 线起点
   * @param {Cesium.Cartesian3} lineEnd - 线终点
   * @returns {number} 距离（米）
   */
  static distanceToLine(point, lineStart, lineEnd) {
    const line = Cesium.Cartesian3.subtract(lineEnd, lineStart, new Cesium.Cartesian3());
    const pointToStart = Cesium.Cartesian3.subtract(point, lineStart, new Cesium.Cartesian3());
    
    const lineLength = Cesium.Cartesian3.magnitude(line);
    const lineDirection = Cesium.Cartesian3.normalize(line, new Cesium.Cartesian3());
    
    const projectionLength = Cesium.Cartesian3.dot(pointToStart, lineDirection);
    
    let closestPoint;
    if (projectionLength <= 0) {
      closestPoint = lineStart;
    } else if (projectionLength >= lineLength) {
      closestPoint = lineEnd;
    } else {
      const projection = Cesium.Cartesian3.multiplyByScalar(lineDirection, projectionLength, new Cesium.Cartesian3());
      closestPoint = Cesium.Cartesian3.add(lineStart, projection, new Cesium.Cartesian3());
    }
    
    return Cesium.Cartesian3.distance(point, closestPoint);
  }

  /**
   * 获取线上指定比例的点
   * @param {Cesium.Cartesian3} start - 起点
   * @param {Cesium.Cartesian3} end - 终点
   * @param {number} ratio - 比例 (0-1)
   * @returns {Cesium.Cartesian3} 线上的点
   */
  static getOnLinePointByRatio(start, end, ratio) {
    return Cesium.Cartesian3.lerp(start, end, ratio, new Cesium.Cartesian3());
  }

  /**
   * 计算多边形中心点
   * @param {Cesium.Cartesian3[]} positions - 多边形顶点
   * @returns {Cesium.Cartesian3} 中心点
   */
  static getCenterOfMass(positions) {
    if (!positions || positions.length === 0) return null;
    
    const center = new Cesium.Cartesian3();
    for (const position of positions) {
      Cesium.Cartesian3.add(center, position, center);
    }
    
    return Cesium.Cartesian3.divideByScalar(center, positions.length, center);
  }
}

/**
 * 格式化工具类
 */
export class FormatUtil {
  /**
   * 格式化距离
   * @param {number} distance - 距离（米）
   * @param {object} options - 选项
   * @returns {string} 格式化后的距离字符串
   */
  static formatDistance(distance, options = {}) {
    const { unit = 'auto', decimal = 2 } = options;
    
    if (unit === 'auto') {
      if (distance < 1000) {
        return distance.toFixed(decimal) + ' 米';
      } else {
        return (distance / 1000).toFixed(decimal) + ' 千米';
      }
    }
    
    const unitConfig = UNIT_CONFIG.length[unit];
    if (unitConfig) {
      const value = distance / unitConfig.ratio;
      return value.toFixed(decimal) + ' ' + unitConfig.name;
    }
    
    return distance.toFixed(decimal) + ' 米';
  }

  /**
   * 格式化面积
   * @param {number} area - 面积（平方米）
   * @param {object} options - 选项
   * @returns {string} 格式化后的面积字符串
   */
  static formatArea(area, options = {}) {
    const { unit = 'auto', decimal = 2 } = options;
    
    if (unit === 'auto') {
      if (area < 10000) {
        return area.toFixed(decimal) + ' 平方米';
      } else {
        return (area / 10000).toFixed(decimal) + ' 公顷';
      }
    }
    
    const unitConfig = UNIT_CONFIG.area[unit];
    if (unitConfig) {
      const value = area / unitConfig.ratio;
      return value.toFixed(decimal) + ' ' + unitConfig.name;
    }
    
    return area.toFixed(decimal) + ' 平方米';
  }

  /**
   * 格式化角度
   * @param {number} angle - 角度
   * @param {object} options - 选项
   * @returns {string} 格式化后的角度字符串
   */
  static formatAngle(angle, options = {}) {
    const { unit = 'degree', decimal = 2 } = options;
    
    const unitConfig = UNIT_CONFIG.angle[unit];
    if (unitConfig) {
      const value = angle * unitConfig.ratio;
      return value.toFixed(decimal) + '°';
    }
    
    return angle.toFixed(decimal) + '°';
  }
}

/**
 * 颜色工具类
 */
export class ColorUtil {
  /**
   * 十六进制颜色转Cesium颜色
   * @param {string} hex - 十六进制颜色值
   * @param {number} alpha - 透明度 (0-1)
   * @returns {Cesium.Color} Cesium颜色对象
   */
  static fromHex(hex, alpha = 1) {
    return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
  }

  /**
   * RGB颜色转Cesium颜色
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @param {number} a - 透明度 (0-1)
   * @returns {Cesium.Color} Cesium颜色对象
   */
  static fromRgb(r, g, b, a = 1) {
    return new Cesium.Color(r / 255, g / 255, b / 255, a);
  }

  /**
   * Cesium颜色转十六进制
   * @param {Cesium.Color} color - Cesium颜色对象
   * @returns {string} 十六进制颜色值
   */
  static toHex(color) {
    const r = Math.round(color.red * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.green * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.blue * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}

// 导出常用函数
export const {
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
  area
} = Util;

export const {
  fromDegrees,
  toDegrees: pointToDegrees,
  distance,
  distanceToLine,
  getOnLinePointByRatio,
  getCenterOfMass
} = PointUtil;

export const {
  formatDistance,
  formatArea,
  formatAngle
} = FormatUtil;

export const {
  fromHex,
  fromRgb,
  toHex
} = ColorUtil;