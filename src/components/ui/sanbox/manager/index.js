/**
 * 数据管理器统一导出
 * 提供三个核心数据管理类的统一入口
 */

import BaseManager from './BaseManager.js'
import TargetBaseManager from './TargetBaseManager.js'
import TargetLocationManager from './TargetLocationManager.js'
import RelationManager from './RelationManager.js'
import TrajectoryManager from './TrajectoryManager.js'
import EventManager from './EventManager.js'

/**
 * 数据管理器工厂类
 * 提供统一的数据管理器创建和初始化方法
 */
class DataManagerFactory {
  constructor(
    targetBaseData = [],
    targetLocationData = [],
    relationData = [],
    trajectoryData = [],
    eventData = [],
  ) {
    this.targetBaseManager = this.createTargetBaseManager(targetBaseData)
    this.targetLocationManager = this.createTargetLocationManager(targetLocationData)
    this.relationManager = this.createRelationManager(relationData)
    this.trajectoryManager = this.createTrajectoryManager(trajectoryData)
    this.eventManager = this.createEventManager(eventData)
  }

  /**
   * 创建目标基础数据管理器
   * @param {Array} initialData - 初始数据
   * @returns {TargetBaseManager} 管理器实例
   */
  createTargetBaseManager(initialData = []) {
    this.targetBaseManager = new TargetBaseManager()
    if (initialData.length > 0) {
      this.targetBaseManager.setInitialData(initialData)
    }
    return this.targetBaseManager
  }

  /**
   * 创建目标位置数据管理器
   * @param {Array} initialData - 初始数据
   * @returns {TargetLocationManager} 管理器实例
   */
  createTargetLocationManager(initialData = []) {
    this.targetLocationManager = new TargetLocationManager()
    if (initialData.length > 0) {
      this.targetLocationManager.setInitialData(initialData)
    }
    return this.targetLocationManager
  }

  /**
   * 创建关系数据管理器
   * @param {Array} initialData - 初始数据
   * @returns {RelationManager} 管理器实例
   */
  createRelationManager(initialData = []) {
    this.relationManager = new RelationManager()
    if (initialData.length > 0) {
      this.relationManager.setInitialData(initialData)
    }
    return this.relationManager
  }

  /**
   * 创建轨迹数据管理器
   * @param {Array} initialData - 初始数据
   * @returns {TrajectoryManager} 管理器实例
   */
  createTrajectoryManager(initialData = []) {
    this.trajectoryManager = new TrajectoryManager()
    if (initialData.length > 0) {
      this.trajectoryManager.setInitialData(initialData)
    }
    return this.trajectoryManager
  }

  /**
   * 创建事件数据管理器
   * @param {Array} initialData - 初始数据
   * @returns {EventManager} 管理器实例
   */
  createEventManager(initialData = []) {
    this.eventManager = new EventManager()
    if (initialData.length > 0) {
      this.eventManager.setInitialData(initialData)
    }
    return this.eventManager
  }

  /**
   * 获取所有管理器实例
   * @returns {Object} 管理器实例对象
   */
  getAllManagers() {
    return {
      targetBaseManager: this.targetBaseManager,
      targetLocationManager: this.targetLocationManager,
      relationManager: this.relationManager,
      trajectoryManager: this.trajectoryManager,
      eventManager: this.eventManager,
    }
  }

  /**
   * 清空所有管理器数据
   */
  clearAllData() {
    if (this.targetBaseManager) this.targetBaseManager.clear()
    if (this.targetLocationManager) this.targetLocationManager.clear()
    if (this.relationManager) this.relationManager.clear()
    if (this.trajectoryManager) this.trajectoryManager.clear()
    if (this.eventManager) this.eventManager.clear()
  }

  /**
   * 获取所有数据的统计信息
   * @returns {Object} 统计信息
   */
  getAllStats() {
    const stats = {
      targetBase: this.targetBaseManager
        ? {
            count: this.targetBaseManager.getCount(),
            types: this.targetBaseManager.getAllTypes(),
            statuses: this.targetBaseManager.getAllStatuses(),
            operators: this.targetBaseManager.getAllOperators(),
          }
        : null,
      targetLocation: this.targetLocationManager
        ? {
            count: this.targetLocationManager.getCount(),
            regions: this.targetLocationManager.getAllRegions(),
            provinces: this.targetLocationManager.getAllProvinces(),
            cities: this.targetLocationManager.getAllCities(),
            bounds: this.targetLocationManager.getBounds(),
          }
        : null,
      relation: this.relationManager ? this.relationManager.getNetworkStats() : null,
      trajectory: this.trajectoryManager
        ? {
            count: this.trajectoryManager.getCount(),
            targets: this.trajectoryManager.getAllTargets(),
            timeRange: this.trajectoryManager.getTimeRange(),
          }
        : null,
      event: this.eventManager ? this.eventManager.getEventStats() : null,
    }

    return stats
  }
}

// 创建全局工厂实例
const dataManagerFactory = new DataManagerFactory()

export {
  BaseManager,
  TargetBaseManager,
  TargetLocationManager,
  RelationManager,
  TrajectoryManager,
  EventManager,
  DataManagerFactory,
  dataManagerFactory,
}

export default {
  BaseManager,
  TargetBaseManager,
  TargetLocationManager,
  RelationManager,
  TrajectoryManager,
  EventManager,
  DataManagerFactory,
  dataManagerFactory,
}
