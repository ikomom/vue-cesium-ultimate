/**
 * 任务管理类 - 用于管理时间轴上的任务集合
 * 继承自BaseThing，提供任务列表的管理和执行功能
 */

// 任务项类型注册表
const TaskItemClass = {};

class Task extends BaseThing {
  /**
   * 获取当前时间
   */
  get currentTime() {
    return this._currentTime;
  }

  /**
   * 获取当前任务索引
   */
  get currentIndex() {
    return this._currentIndex;
  }

  /**
   * 获取任务总数
   */
  get count() {
    return this._arrTaskItem?.length;
  }

  /**
   * 获取总持续时间
   */
  get duration() {
    const lastIndex = this._arrTaskItem?.length;
    if (lastIndex === 0) {
      return 0;
    }
    return this._arrTaskItem[lastIndex - 1].stop;
  }

  /**
   * 获取任务列表配置
   */
  get list() {
    return this.options.list;
  }

  /**
   * 设置任务列表
   * @param {Array} taskList - 任务列表数组
   */
  set list(taskList) {
    this.options.list = taskList;
    this._updateList();
  }

  /**
   * 获取运行时任务列表
   */
  get listRun() {
    return this._arrTaskItem;
  }

  /**
   * 初始化方法
   */
  _mountedHook() {
    this._updateList();
  }

  /**
   * 属性变化监听
   * @param {string} key - 属性键
   * @param {*} value - 属性值
   */
  _addedHook(key, value) {
    if (value.list) {
      this._updateList();
    }
  }

  /**
   * 根据ID获取任务项
   * @param {string} id - 任务ID
   * @returns {Object|null} 任务项对象或null
   */
  getItemById(id) {
    for (let i = 0; i < this._arrTaskItem.length; i++) {
      const item = this._arrTaskItem[i];
      if (item.id === id) {
        return item;
      }
    }
    return null;
  }

  /**
   * 添加任务项
   * @param {Object} taskItem - 任务项配置
   * @returns {Object} 添加的任务项对象
   */
  addItem(taskItem) {
    this.options.list.push(taskItem);
    this._updateList();
    return this._arrTaskItem[this.options.list.length - 1];
  }

  /**
   * 更新任务项
   * @param {Object} taskItem - 任务项配置
   * @returns {boolean} 是否更新成功
   */
  updateItem(taskItem) {
    let updated = false;
    for (let i = 0; i < this.options.list.length; i++) {
      const item = this.options.list[i];
      if (taskItem.id === item.id) {
        this.options.list[i] = taskItem;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._updateList();
    }
    return updated;
  }

  /**
   * 移除任务项
   * @param {string} id - 任务ID
   * @returns {boolean} 是否移除成功
   */
  removeItem(id) {
    let removed = false;
    for (let i = 0; i < this.options.list.length; i++) {
      const item = this.options.list[i];
      if (item.id === id) {
        this.options.list.splice(i, 1);
        removed = true;
        break;
      }
    }
    if (removed) {
      this._updateList();
    }
    return removed;
  }

  /**
   * 更新任务列表
   * @private
   */
  _updateList() {
    this._arrTaskItem = Task.getObjectList(this.options.list, this);
  }

  /**
   * 启动任务执行
   */
  start() {
    // 设置定时器，每500毫秒更新一次
    this._timer = setInterval(() => {
      if (this._map && this._updateFrame) {
        this._updateFrame();
      }
    }, 500);
    
    this._updateFrame();
  }

  /**
   * 停止任务执行
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.disableAll();
  }

  /**
   * 禁用所有任务项
   */
  disableAll() {
    if (this._arrTaskItem) {
      for (let i = 0; i < this._arrTaskItem.length; i++) {
        const item = this._arrTaskItem[i];
        item.disable();
      }
    }
  }

  /**
   * 更新帧 - 根据当前时间更新任务状态
   * @private
   */
  _updateFrame() {
    if (!this._arrTaskItem || this._arrTaskItem.length === 0) {
      return;
    }

    // 检查地图是否可用
    if (this._map?.enabled === false) {
      return;
    }

    const clock = this._map.clock;
    this._currentTime = Cesium.JulianDate.secondsDifference(clock.currentTime, clock.startTime);

    // 遍历所有任务项，更新其状态
    for (let i = 0; i < this._arrTaskItem.length; i++) {
      const taskItem = this._arrTaskItem[i];
      if (clock.shouldAnimate) {
        const activated = taskItem.update(this._currentTime);
        if (activated) {
          this._currentIndex = taskItem.index;
        }
      } else {
        taskItem.disable();
      }
    }
  }

  /**
   * 从配置数组创建任务对象列表
   * @param {Array} list - 任务配置列表
   * @param {Object} parent - 父对象
   * @returns {Array} 任务对象数组
   */
  static getObjectList(list, parent) {
    if (!list || list.length === 0) {
      return [];
    }

    let taskItems = [];

    for (let i = 0; i < list.length; i++) {
      const config = {
        id: list[i].id ?? getGlobalId(),
        index: i,
        ...list[i]
      };

      let type = config.type;
      
      // 处理类型设置
      if (parent instanceof Task) {
        if (!type) {
          continue;
        }
      } else if (parent.constructor.name === 'Thing') {
        type = 'thing';
      }

      // 处理时间设置
      let prevItem;
      if (taskItems.length > 0) {
        prevItem = taskItems[taskItems.length - 1];
        if (!Cesium.defined(config.start)) {
          if (Cesium.defined(config.delay)) {
            config.start = prevItem._stop + config.delay;
          } else {
            config.start = prevItem._stop + 1;
          }
        }
      }

      // 创建任务项实例
      const taskItem = Task.create(type, config);
      if (!taskItem) {
        logWarn('Task数据有误提示：未找到匹配的TaskItem类型', config);
        continue;
      }

      // 验证持续时间
      if (taskItem.duration < 1) {
        logWarn('Task数据有误提示：当前数据执行duration时长有误', taskItem);
      }

      // 设置关联属性
      taskItem._map = parent?._map;
      taskItem._parent = parent;
      
      // 执行挂载钩子
      if (taskItem._mountedHook) {
        taskItem._mountedHook();
      }

      taskItems.push(taskItem);
    }

    // 按开始时间排序
    taskItems = taskItems.sort((a, b) => {
      return a.start !== b.start ? a.start - b.start : a.stop - b.stop;
    });

    // 验证时间重叠
    if (list.length > 2) {
      for (let i = 1; i < list.length; i++) {
        const prevItem = list[i - 1];
        const currentItem = list[i];
        if (currentItem.start > prevItem.start) {
          logWarn(
            `Task数据校验提示：前一条stop结束时间${currentItem.start}大于后一条start开始时间${prevItem.start}(如果是同时进行的请忽略)`,
            prevItem,
            currentItem
          );
        }
      }
    }

    return taskItems;
  }

  /**
   * 注册任务项类型
   * @param {string} type - 任务类型
   * @param {Function} clazz - 任务类构造函数
   */
  static register(type, clazz) {
    if (TaskItemClass[type]) {
      logError(`Task注册提示：${type}类型已存在`, clazz);
    }
    TaskItemClass[type] = clazz;
    clazz.type = type;
    clazz.prototype.type = type;
  }

  /**
   * 获取任务项类型
   * @param {string} type - 任务类型
   * @returns {Function|undefined} 任务类构造函数
   */
  static getClass(type) {
    return TaskItemClass[type];
  }

  /**
   * 创建任务项实例
   * @param {string} type - 任务类型
   * @param {Object} config - 任务配置
   * @returns {Object|undefined} 任务项实例
   */
  static create(type, config) {
    const TaskClass = Task.getClass(type);
    if (TaskClass) {
      const instance = new TaskClass(config);
      return instance;
    } else {
      logWarn(`未处理${type}类型TaskItem对象`, config);
    }
  }
}

// 注册Task类
register('Task', Task, true);

// 导出Task类
export default Task;
export { TaskItemClass };