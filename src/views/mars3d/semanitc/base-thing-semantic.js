/**
 * 基础事物类 - 所有地图对象的基类
 * 继承自BaseClass，提供基础的生命周期管理和事件处理功能
 */

// 导入事件类型常量
const EventType = {
  ADD: 'add',
  REMOVE: 'remove'
};

// 状态枚举
const State = {
  INITIALIZED: 'initialized',
  ADD: 'add',
  ADDED: 'added',
  REMOVE: 'remove',
  DESTROY: 'destroy'
};

class BaseThing extends BaseClass {
  /**
   * 构造函数
   * @param {Object|boolean} options - 配置选项或启用状态
   */
  constructor(options = {}) {
    // 如果传入的是布尔值，转换为配置对象
    if (isBoolean(options)) {
      options = {
        enabled: options
      };
    }

    // 调用父类构造函数
    super(options);

    // 初始化基础属性
    this._id = options.id ?? createGuid();
    this._enabled = options.enabled ?? true;
    this._state = State.INITIALIZED;
    this.options = options;
  }

  /**
   * 获取对象类型
   */
  get type() {
    return this._type;
  }

  /**
   * 设置对象类型
   * @param {string} value - 类型值
   */
  set type(value) {
    this._type = value;
  }

  /**
   * 获取当前状态
   */
  get state() {
    return this._state;
  }

  /**
   * 判断是否已添加到地图
   */
  get isAdded() {
    return this._state === State.ADDED;
  }

  /**
   * 判断是否已销毁
   */
  get isDestroy() {
    return this._state === State.DESTROY || !this._enabled;
  }

  /**
   * 获取对象ID
   */
  get id() {
    return this._id;
  }

  /**
   * 设置对象ID
   * @param {string} value - ID值
   */
  set id(value) {
    this.options.id = value;
  }

  /**
   * 获取启用状态
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * 设置启用状态
   * @param {boolean} value - 启用状态
   */
  set enabled(value) {
    if (this._enabled === value) return;
    
    this._enabled = value;
    
    // 触发启用状态变化钩子
    if (this._enabledHook) {
      this._enabledHook(value);
    }
  }

  /**
   * 添加到指定容器
   * @param {Object} container - 容器对象
   * @returns {BaseThing} 返回自身以支持链式调用
   */
  addTo(container) {
    if (container && container.addThing) {
      container.addThing(this);
    }
    return this;
  }

  /**
   * 从地图中移除
   * @param {boolean} destroy - 是否销毁
   */
  remove(destroy) {
    if (this._map && this._map.removeThing) {
      this._map.removeThing(this, destroy);
    }
  }

  /**
   * 添加到地图时的内部处理方法
   * @param {Object} map - 地图对象
   * @private
   */
  _onAdd(map) {
    // 如果已添加或正在添加，直接返回
    if (this.isAdded || this._state === State.ADD) {
      return;
    }

    // 设置状态和地图引用
    this._state = State.ADD;
    this._map = map;

    // 处理事件父级
    if (this.options.eventParent) {
      this.addEventParent(this.options.eventParent);
    } else if (this.options.eventParent !== false) {
      this.addEventParent(map);
    }

    // 执行挂载钩子（仅执行一次）
    if (this._mountedHook && !this._createOK) {
      this._mountedHook();
      this._createOK = true;
    }

    // 执行添加相关钩子
    if (this._addedBaseHook) {
      this._addedBaseHook();
    }
    
    if (this._addedHook) {
      this._addedHook();
    }

    // 处理可用性设置
    if (this.options.availability) {
      this.availability = this.options.availability;
    }

    // 设置最终状态并触发事件
    this._state = State.ADDED;
    this.fire(EventType.ADD);
  }

  /**
   * 从地图移除时的内部处理方法
   * @private
   */
  _onRemove() {
    // 检查状态
    if (this._state !== State.ADDED) {
      return;
    }
    
    if (!this._map) {
      return;
    }

    // 执行移除相关钩子
    if (this._removedBaseHook) {
      this._removedBaseHook();
    }
    
    if (this._removedHook) {
      this._removedHook();
    }

    // 设置状态并触发事件
    this._state = State.REMOVE;
    this.fire(EventType.REMOVE);

    // 处理事件父级移除
    if (this.options?.eventParent) {
      this.removeEventParent(this.options.eventParent);
    } else if (this.options?.eventParent !== false) {
      this.removeEventParent(this._map);
    }

    // 清空地图引用
    this._map = null;
  }

  /**
   * 挂载钩子 - 子类可重写
   * @protected
   */
  _mountedHook() {
    // 子类实现
  }

  /**
   * 添加钩子 - 子类可重写
   * @protected
   */
  _addedHook() {
    // 子类实现
  }

  /**
   * 移除钩子 - 子类可重写
   * @protected
   */
  _removedHook() {
    // 子类实现
  }

  /**
   * 设置配置选项
   * @param {Object} newOptions - 新的配置选项
   * @param {Object} mergeOptions - 合并选项
   * @returns {BaseThing} 返回自身以支持链式调用
   */
  setOptions(newOptions, mergeOptions) {
    // 检查参数有效性
    if (!newOptions || Object.keys(newOptions).length === 0) {
      return this;
    }

    // 根据合并选项决定是合并还是替换
    const shouldMerge = mergeOptions?.merge ?? true;
    if (shouldMerge) {
      this.options = merge(this.options, newOptions);
    } else {
      this.options = newOptions;
    }

    // 处理启用状态变化
    if (Cesium.defined(newOptions.enabled)) {
      this.enabled = newOptions.enabled;
    }

    // 触发选项设置钩子
    if (this._setOptionsHook) {
      this._setOptionsHook(this.options, newOptions);
    }

    return this;
  }

  /**
   * 转换为JSON配置
   * @returns {Object} JSON配置对象
   */
  toJSON() {
    const excludeKeys = ['parent', 'eventParent', 'layer'];
    const cloneOptions = { onlySimpleType: true };
    
    // 克隆配置，排除特定键
    const config = clone(getAttrVal(this.options, cloneOptions), excludeKeys);
    
    // 设置类型
    config.type = this.type;

    // 处理启用状态
    if (this.enabled === false) {
      config.enabled = this.enabled;
    } else {
      delete config.enabled;
    }

    // 处理可用性
    if (this._availability) {
      config.availability = this.availability;
    }

    // 触发JSON转换钩子
    if (this._toJSONHook) {
      this._toJSONHook(config);
    }

    // 清理未定义和空对象的属性
    for (const key in config) {
      const value = config[key];
      if (!Cesium.defined(value) || 
          (isObject(value) && Object.keys(value).length === 0)) {
        delete config[key];
      }
    }

    return config;
  }

  /**
   * 销毁对象
   * @param {boolean} noDel - 是否不删除
   */
  destroy(noDel) {
    // 如果未销毁，先清理和移除
    if (this._state !== State.DESTROY) {
      if (this.clear) {
        this.clear();
      }
      this.remove();
    }

    // 调用父类销毁方法
    super.destroy(noDel);
    
    // 设置销毁状态
    this._state = State.DESTROY;
  }
}

// 导出类和常量
export default BaseThing;
export { State, EventType };