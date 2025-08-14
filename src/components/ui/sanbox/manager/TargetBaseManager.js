/**
 * 目标基础数据管理器
 * 管理目标的基础信息，包括名称、类型、描述、状态等
 */
import BaseManager from './BaseManager.js'

class TargetBaseManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['id']
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   */
  initializeIndexes() {
    this.indexes.set('type', new Map())
    this.indexes.set('status', new Map())
    this.indexes.set('operator', new Map())
  }

  /**
   * 更新索引
   * @param {Object} item - 数据项
   */
  updateIndexes(item) {
    this._updateIndex('type', item.type, item.id)
    this._updateIndex('status', item.status, item.id)
    this._updateIndex('operator', item.operator, item.id)
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 数据项
   */
  removeFromIndexes(item) {
    this._removeFromIndex('type', item.type, item.id)
    this._removeFromIndex('status', item.status, item.id)
    this._removeFromIndex('operator', item.operator, item.id)
  }



  /**
   * 根据类型查找数据项
   * @param {string} type - 目标类型
   * @returns {Array} 匹配的数据项数组
   */
  findByType(type) {
    return this.findByIndex('type', type)
  }

  /**
   * 根据状态查找数据项
   * @param {string} status - 目标状态
   * @returns {Array} 匹配的数据项数组
   */
  findByStatus(status) {
    return this.findByIndex('status', status)
  }

  /**
   * 根据运营方查找数据项
   * @param {string} operator - 运营方
   * @returns {Array} 匹配的数据项数组
   */
  findByOperator(operator) {
    return this.findByIndex('operator', operator)
  }

  /**
   * 模糊搜索
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的数据项数组
   */
  search(keyword) {
    if (!keyword) return this.getAll()

    const lowerKeyword = keyword.toLowerCase()
    const results = []

    for (const item of this.data.values()) {
      if (
        item.name?.toLowerCase().includes(lowerKeyword) ||
        item.type?.toLowerCase().includes(lowerKeyword) ||
        item.description?.toLowerCase().includes(lowerKeyword) ||
        item.operator?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(item)
      }
    }

    return results
  }



  /**
   * 获取所有类型
   * @returns {Array} 类型数组
   */
  getAllTypes() {
    return this.getIndexValues('type')
  }

  /**
   * 获取所有状态
   * @returns {Array} 状态数组
   */
  getAllStatuses() {
    return this.getIndexValues('status')
  }

  /**
   * 获取所有运营方
   * @returns {Array} 运营方数组
   */
  getAllOperators() {
    return this.getIndexValues('operator')
  }



}

export default TargetBaseManager
