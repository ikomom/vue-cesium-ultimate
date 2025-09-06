/**
 * Mars3D 基础图层类
 * @module layer/BaseLayer
 */

import * as Cesium from 'cesium';
import { EventType, uuid, getAttrVal } from '../core/index.js';

/**
 * 基础图层类 - 所有图层的基类
 */
export class BaseLayer {
  constructor(options = {}) {
    // 基础属性
    this.id = options.id || uuid();
    this.type = options.type || 'base';
    this.name = options.name || '';
    this.show = options.show !== false;
    this.alpha = options.alpha !== undefined ? options.alpha : 1.0;
    this.brightness = options.brightness !== undefined ? options.brightness : 1.0;
    this.contrast = options.contrast !== undefined ? options.contrast : 1.0;
    this.hue = options.hue !== undefined ? options.hue : 0.0;
    this.saturation = options.saturation !== undefined ? options.saturation : 1.0;
    this.gamma = options.gamma !== undefined ? options.gamma : 1.0;
    
    // 图层顺序
    this.zIndex = options.zIndex || 0;
    
    // 可见性控制
    this.minimumLevel = options.minimumLevel || 0;
    this.maximumLevel = options.maximumLevel || 25;
    
    // 事件系统
    this._events = new Map();
    
    // 图层状态
    this._isAdded = false;
    this._isLoading = false;
    this._isDestroyed = false;
    
    // 保存原始配置
    this.options = { ...options };
    
    // Cesium相关
    this._viewer = null;
    this._imageryLayer = null;
    this._primitive = null;
    this._dataSource = null;
  }

  /**
   * 是否已添加到地图
   */
  get isAdded() {
    return this._isAdded;
  }

  /**
   * 是否正在加载
   */
  get isLoading() {
    return this._isLoading;
  }

  /**
   * 是否已销毁
   */
  get isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * 获取Cesium Viewer
   */
  get viewer() {
    return this._viewer;
  }

  /**
   * 添加事件监听
   * @param {string} type - 事件类型
   * @param {Function} callback - 回调函数
   * @param {object} context - 上下文
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
   * @param {object} context - 上下文
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
   * @param {object} data - 事件数据
   */
  fire(type, data = {}) {
    if (!this._events.has(type)) return;
    
    const listeners = this._events.get(type);
    listeners.forEach(listener => {
      try {
        listener.callback.call(listener.context, {
          type,
          target: this,
          ...data
        });
      } catch (error) {
        console.error('事件处理错误:', error);
      }
    });
  }

  /**
   * 添加到地图
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  addTo(viewer) {
    if (this._isAdded || this._isDestroyed) {
      console.warn('图层已添加或已销毁');
      return;
    }

    this._viewer = viewer;
    this._isLoading = true;

    try {
      this._addToMap();
      this._isAdded = true;
      this._isLoading = false;
      
      this.fire(EventType.add, { layer: this });
    } catch (error) {
      this._isLoading = false;
      console.error('添加图层失败:', error);
      this.fire(EventType.loadError, { error, layer: this });
    }
  }

  /**
   * 从地图移除
   */
  remove() {
    if (!this._isAdded || this._isDestroyed) {
      return;
    }

    try {
      this._removeFromMap();
      this._isAdded = false;
      
      this.fire(EventType.remove, { layer: this });
    } catch (error) {
      console.error('移除图层失败:', error);
    }
  }

  /**
   * 销毁图层
   */
  destroy() {
    if (this._isDestroyed) return;

    // 先从地图移除
    if (this._isAdded) {
      this.remove();
    }

    // 清理资源
    this._cleanup();
    
    // 清理事件
    this._events.clear();
    
    // 标记为已销毁
    this._isDestroyed = true;
    
    this.fire(EventType.destroy, { layer: this });
  }

  /**
   * 显示图层
   */
  showLayer() {
    this.show = true;
    this._updateShow();
    this.fire(EventType.show, { layer: this });
  }

  /**
   * 隐藏图层
   */
  hideLayer() {
    this.show = false;
    this._updateShow();
    this.fire(EventType.hide, { layer: this });
  }

  /**
   * 设置透明度
   * @param {number} alpha - 透明度 (0-1)
   */
  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha));
    this._updateAlpha();
    this.fire(EventType.change, { property: 'alpha', value: this.alpha, layer: this });
  }

  /**
   * 设置亮度
   * @param {number} brightness - 亮度
   */
  setBrightness(brightness) {
    this.brightness = brightness;
    this._updateBrightness();
    this.fire(EventType.change, { property: 'brightness', value: this.brightness, layer: this });
  }

  /**
   * 设置对比度
   * @param {number} contrast - 对比度
   */
  setContrast(contrast) {
    this.contrast = contrast;
    this._updateContrast();
    this.fire(EventType.change, { property: 'contrast', value: this.contrast, layer: this });
  }

  /**
   * 设置色调
   * @param {number} hue - 色调
   */
  setHue(hue) {
    this.hue = hue;
    this._updateHue();
    this.fire(EventType.change, { property: 'hue', value: this.hue, layer: this });
  }

  /**
   * 设置饱和度
   * @param {number} saturation - 饱和度
   */
  setSaturation(saturation) {
    this.saturation = saturation;
    this._updateSaturation();
    this.fire(EventType.change, { property: 'saturation', value: this.saturation, layer: this });
  }

  /**
   * 设置伽马值
   * @param {number} gamma - 伽马值
   */
  setGamma(gamma) {
    this.gamma = gamma;
    this._updateGamma();
    this.fire(EventType.change, { property: 'gamma', value: this.gamma, layer: this });
  }

  /**
   * 设置层级
   * @param {number} zIndex - 层级
   */
  setZIndex(zIndex) {
    this.zIndex = zIndex;
    this._updateZIndex();
    this.fire(EventType.change, { property: 'zIndex', value: this.zIndex, layer: this });
  }

  /**
   * 飞行到图层
   * @param {object} options - 飞行选项
   */
  flyTo(options = {}) {
    if (!this._viewer || !this._isAdded) {
      console.warn('图层未添加到地图');
      return;
    }

    const rectangle = this.getRectangle();
    if (rectangle) {
      this._viewer.camera.flyTo({
        destination: rectangle,
        duration: options.duration || 2.0,
        ...options
      });
    }
  }

  /**
   * 获取图层范围
   * @returns {Cesium.Rectangle} 图层范围
   */
  getRectangle() {
    // 子类需要重写此方法
    return null;
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
      show: this.show,
      alpha: this.alpha,
      brightness: this.brightness,
      contrast: this.contrast,
      hue: this.hue,
      saturation: this.saturation,
      gamma: this.gamma,
      zIndex: this.zIndex,
      minimumLevel: this.minimumLevel,
      maximumLevel: this.maximumLevel,
      options: this.options
    };
  }

  // 以下为子类需要重写的方法

  /**
   * 添加到地图的具体实现
   * @protected
   */
  _addToMap() {
    // 子类重写
  }

  /**
   * 从地图移除的具体实现
   * @protected
   */
  _removeFromMap() {
    // 子类重写
  }

  /**
   * 清理资源
   * @protected
   */
  _cleanup() {
    // 子类重写
  }

  /**
   * 更新显示状态
   * @protected
   */
  _updateShow() {
    // 子类重写
  }

  /**
   * 更新透明度
   * @protected
   */
  _updateAlpha() {
    // 子类重写
  }

  /**
   * 更新亮度
   * @protected
   */
  _updateBrightness() {
    // 子类重写
  }

  /**
   * 更新对比度
   * @protected
   */
  _updateContrast() {
    // 子类重写
  }

  /**
   * 更新色调
   * @protected
   */
  _updateHue() {
    // 子类重写
  }

  /**
   * 更新饱和度
   * @protected
   */
  _updateSaturation() {
    // 子类重写
  }

  /**
   * 更新伽马值
   * @protected
   */
  _updateGamma() {
    // 子类重写
  }

  /**
   * 更新层级
   * @protected
   */
  _updateZIndex() {
    // 子类重写
  }
}

export default BaseLayer;