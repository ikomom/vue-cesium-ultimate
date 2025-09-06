/**
 * Mars3D 控制模块索引文件
 * @module control
 * @description 统一导出所有控制相关的类和工具
 */

// 导出控制类
export { BaseControl } from './BaseControl.js';
export { MouseControl } from './MouseControl.js';
export { KeyboardControl } from './KeyboardControl.js';

// 导入控制类
import { BaseControl } from './BaseControl.js';
import { MouseControl } from './MouseControl.js';
import { KeyboardControl } from './KeyboardControl.js';
import { ControlType } from '../core/index.js';

/**
 * 控制工厂类
 * @class ControlFactory
 * @description 用于创建和管理各种控制实例
 */
export class ControlFactory {
  /**
   * 创建控制实例
   * @param {string} type - 控制类型
   * @param {object} options - 配置选项
   * @returns {BaseControl} 控制实例
   */
  static create(type, options = {}) {
    switch (type) {
      case ControlType.MOUSE:
        return new MouseControl(options);
      case ControlType.KEYBOARD:
        return new KeyboardControl(options);
      case ControlType.BASE:
      default:
        return new BaseControl(options);
    }
  }

  /**
   * 从JSON创建控制实例
   * @param {object} json - JSON配置
   * @returns {BaseControl} 控制实例
   */
  static fromJSON(json) {
    if (!json || !json.type) {
      throw new Error('Invalid control JSON: missing type');
    }

    const control = this.create(json.type, json.options || {});
    
    // 设置基本属性
    if (json.id) control.id = json.id;
    if (json.name) control.name = json.name;
    if (json.enabled !== undefined) control.enabled = json.enabled;
    
    return control;
  }

  /**
   * 获取支持的控制类型
   * @returns {Array<string>} 控制类型列表
   */
  static getSupportedTypes() {
    return [
      ControlType.BASE,
      ControlType.MOUSE,
      ControlType.KEYBOARD
    ];
  }

  /**
   * 检查控制类型是否支持
   * @param {string} type - 控制类型
   * @returns {boolean} 是否支持
   */
  static isTypeSupported(type) {
    return this.getSupportedTypes().includes(type);
  }
}

/**
 * 控制管理器类
 * @class ControlManager
 * @description 用于管理多个控制实例
 */
export class ControlManager {
  constructor() {
    this.controls = new Map();
    this.viewer = null;
    this._isDestroyed = false;
  }

  /**
   * 设置Viewer实例
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  setViewer(viewer) {
    this.viewer = viewer;
    
    // 将已有控制添加到新的viewer
    this.controls.forEach(control => {
      if (control.isActive()) {
        control.remove();
        control.addTo(viewer);
      }
    });
    
    return this;
  }

  /**
   * 添加控制
   * @param {BaseControl} control - 控制实例
   * @returns {ControlManager} 管理器实例
   */
  add(control) {
    if (this._isDestroyed) {
      console.warn('ControlManager has been destroyed');
      return this;
    }

    if (!(control instanceof BaseControl)) {
      throw new Error('Control must be an instance of BaseControl');
    }

    this.controls.set(control.id, control);
    
    if (this.viewer) {
      control.addTo(this.viewer);
    }
    
    return this;
  }

  /**
   * 移除控制
   * @param {string|BaseControl} control - 控制ID或控制实例
   * @returns {ControlManager} 管理器实例
   */
  remove(control) {
    const id = typeof control === 'string' ? control : control.id;
    const controlInstance = this.controls.get(id);
    
    if (controlInstance) {
      controlInstance.remove();
      this.controls.delete(id);
    }
    
    return this;
  }

  /**
   * 获取控制
   * @param {string} id - 控制ID
   * @returns {BaseControl|null} 控制实例
   */
  get(id) {
    return this.controls.get(id) || null;
  }

  /**
   * 检查控制是否存在
   * @param {string} id - 控制ID
   * @returns {boolean} 是否存在
   */
  has(id) {
    return this.controls.has(id);
  }

  /**
   * 获取所有控制
   * @returns {Array<BaseControl>} 控制列表
   */
  getAll() {
    return Array.from(this.controls.values());
  }

  /**
   * 根据类型获取控制
   * @param {string} type - 控制类型
   * @returns {Array<BaseControl>} 控制列表
   */
  getByType(type) {
    return this.getAll().filter(control => control.type === type);
  }

  /**
   * 启用所有控制
   * @returns {ControlManager} 管理器实例
   */
  enableAll() {
    this.controls.forEach(control => control.enable());
    return this;
  }

  /**
   * 禁用所有控制
   * @returns {ControlManager} 管理器实例
   */
  disableAll() {
    this.controls.forEach(control => control.disable());
    return this;
  }

  /**
   * 启用指定类型的控制
   * @param {string} type - 控制类型
   * @returns {ControlManager} 管理器实例
   */
  enableByType(type) {
    this.getByType(type).forEach(control => control.enable());
    return this;
  }

  /**
   * 禁用指定类型的控制
   * @param {string} type - 控制类型
   * @returns {ControlManager} 管理器实例
   */
  disableByType(type) {
    this.getByType(type).forEach(control => control.disable());
    return this;
  }

  /**
   * 清空所有控制
   * @returns {ControlManager} 管理器实例
   */
  clear() {
    this.controls.forEach(control => {
      control.destroy();
    });
    this.controls.clear();
    return this;
  }

  /**
   * 获取控制数量
   * @returns {number} 控制数量
   */
  size() {
    return this.controls.size;
  }

  /**
   * 检查是否为空
   * @returns {boolean} 是否为空
   */
  isEmpty() {
    return this.controls.size === 0;
  }

  /**
   * 遍历所有控制
   * @param {function} callback - 回调函数
   * @param {object} context - 上下文
   */
  forEach(callback, context) {
    this.controls.forEach((control, id) => {
      callback.call(context || this, control, id);
    });
  }

  /**
   * 导出为JSON
   * @returns {Array<object>} JSON数组
   */
  toJSON() {
    return this.getAll().map(control => control.toJSON());
  }

  /**
   * 从JSON导入控制
   * @param {Array<object>} jsonArray - JSON数组
   * @returns {ControlManager} 管理器实例
   */
  fromJSON(jsonArray) {
    if (!Array.isArray(jsonArray)) {
      throw new Error('Invalid JSON: expected array');
    }

    jsonArray.forEach(json => {
      try {
        const control = ControlFactory.fromJSON(json);
        this.add(control);
      } catch (error) {
        console.error('Failed to create control from JSON:', error, json);
      }
    });
    
    return this;
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this._isDestroyed) return;
    
    this.clear();
    this.viewer = null;
    this._isDestroyed = true;
  }

  /**
   * 检查是否已销毁
   * @returns {boolean} 是否已销毁
   */
  isDestroyed() {
    return this._isDestroyed;
  }
}

// 默认导出
export default {
  BaseControl,
  MouseControl,
  KeyboardControl,
  ControlFactory,
  ControlManager
};