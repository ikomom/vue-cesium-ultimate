/**
 * Mars3D 基础实体类
 * @module graphic/BaseEntity
 */

import * as Cesium from 'cesium';
import { EventType, uuid, getAttrVal } from '../core/index.js';

/**
 * 基础实体类 - 所有图形对象的基类
 */
export class BaseEntity {
  constructor(options = {}) {
    this.options = { ...options };
    this.id = options.id || uuid('entity');
    this.type = options.type || 'baseEntity';
    this.name = options.name || '';
    this.show = options.show !== false;
    this.allowDrillPick = options.allowDrillPick !== false;
    
    // 事件系统
    this._events = new Map();
    
    // 状态标记
    this._isAdded = false;
    this._isDestroyed = false;
    
    // 关联的地图和图层
    this._map = null;
    this._layer = null;
    
    // Cesium实体对象
    this.entity = null;
    this.dataSource = null;
    
    // 样式相关
    this._style = options.style || {};
    this._originalStyle = null;
    
    // 位置相关
    this._positions = [];
    this._positionsShow = [];
    
    // 编辑相关
    this.isEditing = false;
    this.hasEdit = options.hasEdit !== false;
    this.hasMoveEdit = options.hasMoveEdit !== false;
    
    // 绑定方法上下文
    this._onEntityClick = this._onEntityClick.bind(this);
    this._onEntityMouseOver = this._onEntityMouseOver.bind(this);
    this._onEntityMouseOut = this._onEntityMouseOut.bind(this);
  }

  /**
   * 获取实体ID
   */
  get entityId() {
    return this.id;
  }

  /**
   * 获取位置数组
   */
  get positions() {
    return this._positions;
  }

  /**
   * 设置位置数组
   */
  set positions(val) {
    this._positions = val || [];
    this._updatePositions();
  }

  /**
   * 获取显示用的位置数组
   */
  get positionsShow() {
    return this._positionsShow;
  }

  /**
   * 获取样式
   */
  get style() {
    return this._style;
  }

  /**
   * 设置样式
   */
  set style(val) {
    this._style = val || {};
    this._updateStyle();
  }

  /**
   * 获取关联的地图对象
   */
  get map() {
    return this._map;
  }

  /**
   * 获取关联的图层对象
   */
  get layer() {
    return this._layer;
  }

  /**
   * 是否已添加到地图
   */
  get isAdded() {
    return this._isAdded;
  }

  /**
   * 是否已销毁
   */
  get isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * 添加事件监听
   * @param {string} type - 事件类型
   * @param {Function} callback - 回调函数
   * @param {*} context - 上下文
   */
  on(type, callback, context) {
    if (!this._events.has(type)) {
      this._events.set(type, []);
    }
    this._events.get(type).push({ callback, context });
  }

  /**
   * 移除事件监听
   * @param {string} type - 事件类型
   * @param {Function} callback - 回调函数
   * @param {*} context - 上下文
   */
  off(type, callback, context) {
    if (!this._events.has(type)) return;
    
    const listeners = this._events.get(type);
    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];
      if (listener.callback === callback && listener.context === context) {
        listeners.splice(i, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} type - 事件类型
   * @param {*} data - 事件数据
   * @param {boolean} propagate - 是否向上传播
   */
  fire(type, data, propagate = false) {
    if (this._events.has(type)) {
      const listeners = this._events.get(type);
      listeners.forEach(listener => {
        try {
          listener.callback.call(listener.context, {
            type,
            target: this,
            ...data
          });
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
    
    // 向图层传播事件
    if (propagate && this._layer) {
      this._layer.fire(type, { target: this, ...data });
    }
  }

  /**
   * 添加到地图
   * @param {object} map - 地图对象
   * @param {object} layer - 图层对象
   */
  addTo(map, layer) {
    if (this._isAdded) return this;
    
    this._map = map;
    this._layer = layer;
    this.dataSource = layer.dataSource;
    
    // 创建Cesium实体
    this._createEntity();
    
    // 添加到数据源
    if (this.entity && this.dataSource) {
      this.dataSource.entities.add(this.entity);
      this._bindEvents();
    }
    
    this._isAdded = true;
    this._addedHook();
    
    this.fire(EventType.add, {}, true);
    
    return this;
  }

  /**
   * 从地图移除
   */
  remove() {
    if (!this._isAdded) return this;
    
    this._removedHook();
    
    // 从数据源移除
    if (this.entity && this.dataSource) {
      this._unbindEvents();
      this.dataSource.entities.remove(this.entity);
    }
    
    this._isAdded = false;
    this._map = null;
    this._layer = null;
    this.dataSource = null;
    
    this.fire(EventType.remove, {}, true);
    
    return this;
  }

  /**
   * 销毁对象
   */
  destroy() {
    if (this._isDestroyed) return;
    
    this.remove();
    
    // 清理事件
    this._events.clear();
    
    // 清理属性
    this.entity = null;
    this.options = null;
    this._style = null;
    this._positions = null;
    this._positionsShow = null;
    
    this._isDestroyed = true;
  }

  /**
   * 显示/隐藏实体
   * @param {boolean} show - 是否显示
   */
  setShow(show) {
    this.show = show;
    if (this.entity) {
      this.entity.show = show;
    }
    this._showHook(show);
    this.fire(show ? EventType.show : EventType.hide, {}, true);
  }

  /**
   * 更新样式
   * @param {object} style - 新样式
   */
  setStyle(style) {
    this.style = { ...this._style, ...style };
  }

  /**
   * 转换为JSON
   * @returns {object} JSON对象
   */
  toJSON() {
    const json = {
      type: this.type,
      id: this.id,
      name: this.name,
      show: this.show,
      positions: this.positions,
      style: this.style,
      ...this.options
    };
    
    // 扩展JSON
    this._toJSON_Ex(json);
    
    return json;
  }

  /**
   * 从JSON创建实体
   * @param {object} json - JSON对象
   * @returns {BaseEntity} 实体对象
   */
  static fromJSON(json) {
    return new this(json);
  }

  // 钩子方法 - 子类可重写
  
  /**
   * 创建Cesium实体 - 子类必须实现
   * @protected
   */
  _createEntity() {
    throw new Error('_createEntity method must be implemented by subclass');
  }

  /**
   * 添加后的钩子方法
   * @protected
   */
  _addedHook() {
    // 子类可重写
  }

  /**
   * 移除前的钩子方法
   * @protected
   */
  _removedHook() {
    // 子类可重写
  }

  /**
   * 显示/隐藏的钩子方法
   * @protected
   */
  _showHook(show) {
    // 子类可重写
  }

  /**
   * 更新位置的钩子方法
   * @protected
   */
  _updatePositionsHook() {
    // 子类可重写
  }

  /**
   * 更新样式的钩子方法
   * @protected
   */
  _updateStyleHook() {
    // 子类可重写
  }

  /**
   * JSON扩展的钩子方法
   * @protected
   */
  _toJSON_Ex(json) {
    // 子类可重写
  }

  // 内部方法
  
  /**
   * 更新位置
   * @private
   */
  _updatePositions() {
    this._positionsShow = [...this._positions];
    this._updatePositionsHook();
  }

  /**
   * 更新样式
   * @private
   */
  _updateStyle() {
    this._updateStyleHook();
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    if (!this.entity || !this._map) return;
    
    // 绑定点击事件
    this.entity.onclick = this._onEntityClick;
    
    // 绑定鼠标事件
    this.entity.onmouseover = this._onEntityMouseOver;
    this.entity.onmouseout = this._onEntityMouseOut;
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    if (!this.entity) return;
    
    this.entity.onclick = null;
    this.entity.onmouseover = null;
    this.entity.onmouseout = null;
  }

  /**
   * 实体点击事件处理
   * @private
   */
  _onEntityClick(event) {
    this.fire(EventType.click, { event }, true);
  }

  /**
   * 实体鼠标悬停事件处理
   * @private
   */
  _onEntityMouseOver(event) {
    this.fire(EventType.mouseOver, { event }, true);
  }

  /**
   * 实体鼠标离开事件处理
   * @private
   */
  _onEntityMouseOut(event) {
    this.fire(EventType.mouseOut, { event }, true);
  }
}

export default BaseEntity;