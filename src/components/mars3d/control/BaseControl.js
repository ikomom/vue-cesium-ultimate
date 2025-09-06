/**
 * Mars3D 基础控制类
 * @class BaseControl
 * @description 所有控制类的基类，提供通用的控制功能
 */

import { EventType, uuid } from '../core/index.js';

export class BaseControl {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    this.id = options.id || uuid();
    this.type = options.type || 'BaseControl';
    this.name = options.name || '';
    this.enabled = options.enabled !== false;
    this.viewer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    
    // 事件系统
    this._events = new Map();
    
    // 内部状态
    this._isActive = false;
    this._isDestroyed = false;
    
    // 配置选项
    this.options = { ...options };
  }

  /**
   * 添加到地图
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  addTo(viewer) {
    if (this._isDestroyed) {
      console.warn('Control has been destroyed');
      return this;
    }

    this.viewer = viewer;
    this.scene = viewer.scene;
    this.camera = viewer.camera;
    this.canvas = viewer.canvas;
    
    this._addToMap();
    this._isActive = true;
    
    this.fire(EventType.ADD, { control: this });
    return this;
  }

  /**
   * 从地图移除
   */
  remove() {
    if (!this._isActive) return this;
    
    this._removeFromMap();
    this._isActive = false;
    
    this.fire(EventType.REMOVE, { control: this });
    return this;
  }

  /**
   * 销毁控制
   */
  destroy() {
    if (this._isDestroyed) return;
    
    this.remove();
    this._cleanup();
    this._events.clear();
    this._isDestroyed = true;
    
    this.fire(EventType.DESTROY, { control: this });
  }

  /**
   * 启用控制
   */
  enable() {
    if (this.enabled) return this;
    
    this.enabled = true;
    this._onEnable();
    this.fire(EventType.ENABLE, { control: this });
    return this;
  }

  /**
   * 禁用控制
   */
  disable() {
    if (!this.enabled) return this;
    
    this.enabled = false;
    this._onDisable();
    this.fire(EventType.DISABLE, { control: this });
    return this;
  }

  /**
   * 切换启用状态
   */
  toggle() {
    return this.enabled ? this.disable() : this.enable();
  }

  /**
   * 是否处于活动状态
   * @returns {boolean}
   */
  isActive() {
    return this._isActive && !this._isDestroyed;
  }

  /**
   * 是否已销毁
   * @returns {boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * 绑定事件
   * @param {string} type - 事件类型
   * @param {function} listener - 事件监听器
   * @param {object} context - 上下文
   */
  on(type, listener, context) {
    if (!this._events.has(type)) {
      this._events.set(type, []);
    }
    this._events.get(type).push({ listener, context });
    return this;
  }

  /**
   * 解绑事件
   * @param {string} type - 事件类型
   * @param {function} listener - 事件监听器
   * @param {object} context - 上下文
   */
  off(type, listener, context) {
    if (!this._events.has(type)) return this;
    
    const events = this._events.get(type);
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.listener === listener && event.context === context) {
        events.splice(i, 1);
      }
    }
    
    if (events.length === 0) {
      this._events.delete(type);
    }
    return this;
  }

  /**
   * 触发事件
   * @param {string} type - 事件类型
   * @param {object} data - 事件数据
   */
  fire(type, data = {}) {
    if (!this._events.has(type)) return this;
    
    const events = this._events.get(type);
    events.forEach(({ listener, context }) => {
      try {
        listener.call(context || this, { type, target: this, ...data });
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
    return this;
  }

  /**
   * 获取配置选项
   * @param {string} key - 配置键
   * @returns {*} 配置值
   */
  getOption(key) {
    return this.options[key];
  }

  /**
   * 设置配置选项
   * @param {string|object} key - 配置键或配置对象
   * @param {*} value - 配置值
   */
  setOption(key, value) {
    if (typeof key === 'object') {
      Object.assign(this.options, key);
    } else {
      this.options[key] = value;
    }
    this._onOptionsChange();
    return this;
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      enabled: this.enabled,
      options: { ...this.options }
    };
  }

  /**
   * 从JSON创建实例
   * @param {object} json - JSON对象
   * @returns {BaseControl} 控制实例
   */
  static fromJSON(json) {
    return new this(json);
  }

  // 内部方法，供子类重写
  
  /**
   * 添加到地图的内部实现
   * @protected
   */
  _addToMap() {
    // 子类重写
  }

  /**
   * 从地图移除的内部实现
   * @protected
   */
  _removeFromMap() {
    // 子类重写
  }

  /**
   * 清理资源的内部实现
   * @protected
   */
  _cleanup() {
    // 子类重写
  }

  /**
   * 启用时的内部实现
   * @protected
   */
  _onEnable() {
    // 子类重写
  }

  /**
   * 禁用时的内部实现
   * @protected
   */
  _onDisable() {
    // 子类重写
  }

  /**
   * 配置选项变化时的内部实现
   * @protected
   */
  _onOptionsChange() {
    // 子类重写
  }
}

export default BaseControl;