/**
 * 任务项类 - 用于管理时间轴上的任务项
 * 继承自BaseClass，提供任务的生命周期管理功能
 */
class TaskItem extends BaseClass {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {number} options.start - 开始时间
   * @param {number} options.duration - 持续时间
   * @param {number} options.stop - 结束时间
   */
  constructor(options = {}) {
    super(options)

    // 设置开始时间，默认为0
    this._start = options.start ?? 0

    // 根据是否提供duration来计算结束时间和持续时间
    if (Cesium.defined(options.duration)) {
      this._duration = options.duration
      this._stop = this._start + this._duration
    } else {
      this._stop = options.stop
      this._duration = this._stop - this._start
    }
  }

  /**
   * 获取任务ID
   */
  get id() {
    return this.options.id
  }

  /**
   * 获取任务类型
   */
  get type() {
    return this.options.type
  }

  /**
   * 获取当前时间
   */
  get time() {
    return this._currentTime
  }

  /**
   * 获取任务索引
   */
  get index() {
    return this.options.index
  }

  /**
   * 获取开始时间
   */
  get start() {
    return this._start
  }

  /**
   * 获取结束时间
   */
  get stop() {
    return this._stop
  }

  /**
   * 获取持续时间
   */
  get duration() {
    return this._duration
  }

  /**
   * 获取剩余时间
   * 如果当前时间不在任务时间范围内，返回0
   */
  get remainingTime() {
    if (this._currentTime < this._start || this._currentTime > this._stop) {
      return 0
    }
    return this._duration - (this._currentTime - this._start)
  }

  /**
   * 获取任务是否激活状态
   */
  get isActivate() {
    return this._isActivate
  }

  /**
   * 获取任务是否暂停状态
   */
  get isPause() {
    return this._isPause
  }

  /**
   * 更新任务状态
   * @param {number} currentTime - 当前时间
   */
  update(currentTime) {
    this._currentTime = currentTime

    // 如果任务被禁用或隐藏，直接返回
    if (this.options.enabled === false || this.options.show === false) {
      return
    }

    // 根据时间范围决定激活或禁用任务
    if (currentTime < this._start || currentTime >= this._stop) {
      this.disable()
    } else {
      return this.activate()
    }
  }

  /**
   * 激活任务
   * @returns {boolean} 是否成功激活
   */
  activate() {
    // 如果已暂停，则继续执行
    if (this._isPause) {
      this.proceed()
      return
    }

    // 如果已经激活，返回false
    if (this._isActivate) {
      return false
    }

    // 设置激活状态并触发事件
    this._isActivate = true
    this._parent.fire(EventType.startItem, {
      index: this.index,
      time: this.time,
      sourceTarget: this,
    })

    // 执行激活工作
    if (this._activateWork) {
      this._activateWork(this.options)
    }

    return true
  }

  /**
   * 禁用任务
   * @returns {boolean} 是否成功禁用
   */
  disable() {
    if (!this._isActivate) {
      return false
    }

    // 清除激活状态
    delete this._isActivate

    // 执行禁用工作
    if (this._disableWork) {
      this._disableWork(this.options)
    }

    // 触发结束事件
    this._parent.fire(EventType.endItem, {
      index: this.index,
      time: this.time,
      sourceTarget: this,
    })

    return true
  }

  /**
   * 暂停任务
   * @returns {boolean} 是否成功暂停
   */
  pause() {
    if (!this._isActivate || this._isPause) {
      return false
    }

    // 设置暂停状态并触发事件
    this._isPause = true
    this._parent.fire('pauseItem', {
      index: this.index,
      time: this.time,
      sourceTarget: this,
    })

    // 执行暂停工作
    if (this._pauseWork) {
      this._pauseWork(this.options)
    } else if (this._disableWork) {
      // 如果没有暂停工作，则执行禁用工作
      delete this._isActivate
      this._disableWork(this.options)
    }
  }

  /**
   * 继续执行任务（从暂停状态恢复）
   * @returns {boolean} 是否成功继续
   */
  proceed() {
    if (!this._isPause) {
      return false
    }

    // 清除暂停状态并触发事件
    delete this._isPause
    this._parent.fire('proceedItem', {
      index: this.index,
      time: this.time,
      sourceTarget: this,
    })

    // 执行继续工作
    if (this._proceedWork) {
      this._proceedWork(this.options)
    } else if (this._activateWork) {
      // 如果没有继续工作，则执行激活工作
      this._activateWork(this.options)
    }
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON对象
   */
  toJSON() {
    // 克隆选项，排除特定属性
    const result = clone(getAttrVal(this.options, { onlySimpleType: true }), [
      'eventParent',
      'eventParent',
    ])

    // 设置类型
    result.type = this.type

    // 执行自定义JSON转换
    if (this._toJsonEx) {
      this._toJsonEx(result)
    }

    // 清理未定义或空对象的属性
    for (const key in result) {
      const value = result[key]
      if (!Cesium.defined(value) || (isObject(value) && Object.keys(value).length === 0)) {
        delete result[key]
      }
    }

    return result
  }
}

// 导出TaskItem类
export default TaskItem
