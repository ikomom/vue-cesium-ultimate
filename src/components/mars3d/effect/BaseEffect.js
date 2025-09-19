/**
 * Mars3D 基础效果类
 * @class BaseEffect
 * @description 所有效果类的基类，提供通用的效果功能
 */

import { EventType, uuid } from '../core/index.js';

export class BaseEffect {
  /**
   * 构造函数
   * @param {object} options - 配置选项
   */
  constructor(options = {}) {
    this.id = options.id || uuid();
    this.type = options.type || 'BaseEffect';
    this.name = options.name || '';
    this.enabled = options.enabled !== false;
    this.viewer = null;
    this.scene = null;
    this.camera = null;
    
    // 事件系统
    this._events = new Map();
    
    // 内部状态
    this._isActive = false;
    this._isDestroyed = false;
    this._isPlaying = false;
    this._isPaused = false;
    
    // 效果属性
    this.duration = options.duration || 0; // 持续时间（毫秒），0表示无限
    this.loop = options.loop !== false; // 是否循环
    this.autoStart = options.autoStart !== false; // 是否自动开始
    this.intensity = options.intensity || 1.0; // 效果强度
    
    // 时间控制
    this._startTime = 0;
    this._pauseTime = 0;
    this._elapsedTime = 0;
    this._animationFrame = null;
    
    // 配置选项
    this.options = { ...options };
  }

  /**
   * 添加到地图
   * @param {Cesium.Viewer} viewer - Cesium Viewer实例
   */
  addTo(viewer) {
    if (this._isDestroyed) {
      console.warn('Effect has been destroyed');
      return this;
    }

    this.viewer = viewer;
    this.scene = viewer.scene;
    this.camera = viewer.camera;
    
    this._addToMap();
    this._isActive = true;
    
    if (this.autoStart) {
      this.start();
    }
    
    this.fire(EventType.ADD, { effect: this });
    return this;
  }

  /**
   * 从地图移除
   */
  remove() {
    if (!this._isActive) return this;
    
    this.stop();
    this._removeFromMap();
    this._isActive = false;
    
    this.fire(EventType.REMOVE, { effect: this });
    return this;
  }

  /**
   * 销毁效果
   */
  destroy() {
    if (this._isDestroyed) return;
    
    this.remove();
    this._cleanup();
    this._events.clear();
    this._isDestroyed = true;
    
    this.fire(EventType.DESTROY, { effect: this });
  }

  /**
   * 开始效果
   */
  start() {
    if (this._isDestroyed || !this._isActive) return this;
    
    if (this._isPlaying) {
      this.stop();
    }
    
    this._isPlaying = true;
    this._isPaused = false;
    this._startTime = Date.now();
    this._elapsedTime = 0;
    
    this._onStart();
    this._animate();
    
    this.fire(EventType.START, { effect: this });
    return this;
  }

  /**
   * 停止效果
   */
  stop() {
    if (!this._isPlaying) return this;
    
    this._isPlaying = false;
    this._isPaused = false;
    this._elapsedTime = 0;
    
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    
    this._onStop();
    
    this.fire(EventType.STOP, { effect: this });
    return this;
  }

  /**
   * 暂停效果
   */
  pause() {
    if (!this._isPlaying || this._isPaused) return this;
    
    this._isPaused = true;
    this._pauseTime = Date.now();
    
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    
    this._onPause();
    
    this.fire(EventType.PAUSE, { effect: this });
    return this;
  }

  /**
   * 恢复效果
   */
  resume() {
    if (!this._isPlaying || !this._isPaused) return this;
    
    this._isPaused = false;
    this._startTime += Date.now() - this._pauseTime;
    
    this._onResume();
    this._animate();
    
    this.fire(EventType.RESUME, { effect: this });
    return this;
  }

  /**
   * 重置效果
   */
  reset() {
    this.stop();
    this._elapsedTime = 0;
    this._onReset();
    
    this.fire(EventType.RESET, { effect: this });
    return this;
  }

  /**
   * 启用效果
   */
  enable() {
    if (this.enabled) return this;
    
    this.enabled = true;
    this._onEnable();
    this.fire(EventType.ENABLE, { effect: this });
    return this;
  }

  /**
   * 禁用效果
   */
  disable() {
    if (!this.enabled) return this;
    
    this.enabled = false;
    this.stop();
    this._onDisable();
    this.fire(EventType.DISABLE, { effect: this });
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
   * 是否正在播放
   * @returns {boolean}
   */
  isPlaying() {
    return this._isPlaying && !this._isPaused;
  }

  /**
   * 是否已暂停
   * @returns {boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * 是否已销毁
   * @returns {boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * 获取播放进度（0-1）
   * @returns {number}
   */
  getProgress() {
    if (!this.duration || this.duration <= 0) return 0;
    return Math.min(this._elapsedTime / this.duration, 1);
  }

  /**
   * 设置播放进度（0-1）
   * @param {number} progress - 进度值
   */
  setProgress(progress) {
    if (!this.duration || this.duration <= 0) return this;
    
    progress = Math.max(0, Math.min(1, progress));
    this._elapsedTime = progress * this.duration;
    
    if (this._isPlaying) {
      this._startTime = Date.now() - this._elapsedTime;
    }
    
    this._onProgressChange(progress);
    return this;
  }

  /**
   * 获取剩余时间
   * @returns {number}
   */
  getRemainingTime() {
    if (!this.duration || this.duration <= 0) return Infinity;
    return Math.max(0, this.duration - this._elapsedTime);
  }

  /**
   * 设置效果强度
   * @param {number} intensity - 强度值
   */
  setIntensity(intensity) {
    this.intensity = Math.max(0, intensity);
    this._onIntensityChange(this.intensity);
    return this;
  }

  /**
   * 动画循环
   * @private
   */
  _animate() {
    if (!this._isPlaying || this._isPaused || this._isDestroyed) return;
    
    const currentTime = Date.now();
    this._elapsedTime = currentTime - this._startTime;
    
    // 检查是否完成
    if (this.duration > 0 && this._elapsedTime >= this.duration) {
      if (this.loop) {
        // 循环播放
        this._startTime = currentTime;
        this._elapsedTime = 0;
        this._onLoop();
        this.fire(EventType.LOOP, { effect: this });
      } else {
        // 播放完成
        this._elapsedTime = this.duration;
        this._isPlaying = false;
        this._onComplete();
        this.fire(EventType.COMPLETE, { effect: this });
        return;
      }
    }
    
    // 更新效果
    this._onUpdate(this._elapsedTime, this.getProgress());
    
    // 继续动画
    this._animationFrame = requestAnimationFrame(() => this._animate());
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
      duration: this.duration,
      loop: this.loop,
      autoStart: this.autoStart,
      intensity: this.intensity,
      options: { ...this.options }
    };
  }

  /**
   * 从JSON创建实例
   * @param {object} json - JSON对象
   * @returns {BaseEffect} 效果实例
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
   * 开始时的内部实现
   * @protected
   */
  _onStart() {
    // 子类重写
  }

  /**
   * 停止时的内部实现
   * @protected
   */
  _onStop() {
    // 子类重写
  }

  /**
   * 暂停时的内部实现
   * @protected
   */
  _onPause() {
    // 子类重写
  }

  /**
   * 恢复时的内部实现
   * @protected
   */
  _onResume() {
    // 子类重写
  }

  /**
   * 重置时的内部实现
   * @protected
   */
  _onReset() {
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
   * 更新时的内部实现
   * @protected
   * @param {number} elapsedTime - 已过时间
   * @param {number} progress - 进度（0-1）
   */
  _onUpdate(elapsedTime, progress) {
    // 子类重写
  }

  /**
   * 循环时的内部实现
   * @protected
   */
  _onLoop() {
    // 子类重写
  }

  /**
   * 完成时的内部实现
   * @protected
   */
  _onComplete() {
    // 子类重写
  }

  /**
   * 进度变化时的内部实现
   * @protected
   * @param {number} progress - 进度（0-1）
   */
  _onProgressChange(progress) {
    // 子类重写
  }

  /**
   * 强度变化时的内部实现
   * @protected
   * @param {number} intensity - 强度值
   */
  _onIntensityChange(intensity) {
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

export default BaseEffect;