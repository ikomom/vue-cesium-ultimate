/**
 * 数据管理器统一导出
 * 提供三个核心数据管理类的统一入口
 */

import TargetBaseManager from './TargetBaseManager.js'
import TargetLocationManager from './TargetLocationManager.js'
import RelationManager from './RelationManager.js'

/**
 * 数据管理器工厂类
 * 提供统一的数据管理器创建和初始化方法
 */
class DataManagerFactory {
  constructor(targetBaseData = [], targetLocationData = [], relationData = []) {
    this.targetBaseManager = this.createTargetBaseManager(targetBaseData)
    this.targetLocationManager = this.createTargetLocationManager(targetLocationData)
    this.relationManager = this.createRelationManager(relationData)
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
   * 获取所有管理器实例
   * @returns {Object} 管理器实例对象
   */
  getAllManagers() {
    return {
      targetBaseManager: this.targetBaseManager,
      targetLocationManager: this.targetLocationManager,
      relationManager: this.relationManager,
    }
  }

  /**
   * 清空所有管理器数据
   */
  clearAllData() {
    if (this.targetBaseManager) this.targetBaseManager.clear()
    if (this.targetLocationManager) this.targetLocationManager.clear()
    if (this.relationManager) this.relationManager.clear()
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
    }

    return stats
  }
}

// 创建全局工厂实例
const dataManagerFactory = new DataManagerFactory()

export {
  TargetBaseManager,
  TargetLocationManager,
  RelationManager,
  DataManagerFactory,
  dataManagerFactory,
}

export default {
  TargetBaseManager,
  TargetLocationManager,
  RelationManager,
  DataManagerFactory,
  dataManagerFactory,
}
