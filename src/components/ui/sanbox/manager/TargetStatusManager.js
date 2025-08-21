/**
 * 目标状态数据管理器
 * 管理目标的状态信息，包括状态类型、开始时间、结束时间、颜色编码等
 */
import BaseManager from './BaseManager.js'

class TargetStatusManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['id', 'target_id']
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   */
  initializeIndexes() {
    this.indexes.set('target_id', new Map())
    this.indexes.set('status_type', new Map())
    this.indexes.set('status_name', new Map())
    this.indexes.set('priority', new Map())
    this.indexes.set('color_code', new Map())
  }

  /**
   * 更新索引
   * @param {Object} item - 数据项
   */
  updateIndexes(item) {
    this._updateIndex('target_id', item.target_id, item.id || item.target_id)
    this._updateIndex('status_type', item.status_type, item.id || item.target_id)
    this._updateIndex('status_name', item.status_name, item.id || item.target_id)
    this._updateIndex('priority', item.priority, item.id || item.target_id)
    this._updateIndex('color_code', item.color_code, item.id || item.target_id)
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 数据项
   */
  removeFromIndexes(item) {
    this._removeFromIndex('target_id', item.target_id, item.id || item.target_id)
    this._removeFromIndex('status_type', item.status_type, item.id || item.target_id)
    this._removeFromIndex('status_name', item.status_name, item.id || item.target_id)
    this._removeFromIndex('priority', item.priority, item.id || item.target_id)
    this._removeFromIndex('color_code', item.color_code, item.id || item.target_id)
  }

  /**
   * 自定义验证逻辑
   * @param {Object} item - 数据项
   * @returns {boolean} 是否有效
   */
  customValidation(item) {
    // 验证target_id是否存在
    if (!item.target_id) {
      console.error('目标状态数据缺少target_id字段:', item)
      return false
    }

    // 验证时间格式（如果存在）
    if (item.start_time && !this.isValidDateTime(item.start_time)) {
      console.error('start_time格式无效:', item.start_time)
      return false
    }

    if (item.end_time && !this.isValidDateTime(item.end_time)) {
      console.error('end_time格式无效:', item.end_time)
      return false
    }

    return true
  }

  /**
   * 验证日期时间格式
   * @param {string} dateTime - 日期时间字符串
   * @returns {boolean} 是否有效
   */
  isValidDateTime(dateTime) {
    if (typeof dateTime !== 'string') return false
    const date = new Date(dateTime)
    return !isNaN(date.getTime())
  }

  /**
   * 根据目标ID查找状态数据
   * @param {string} targetId - 目标ID
   * @returns {Array} 匹配的状态数据数组
   */
  findByTargetId(targetId) {
    return this.findByIndex('target_id', targetId)
  }

  /**
   * 根据状态类型查找数据项
   * @param {string} statusType - 状态类型
   * @returns {Array} 匹配的数据项数组
   */
  findByStatusType(statusType) {
    return this.findByIndex('status_type', statusType)
  }

  /**
   * 根据状态名称查找数据项
   * @param {string} statusName - 状态名称
   * @returns {Array} 匹配的数据项数组
   */
  findByStatusName(statusName) {
    return this.findByIndex('status_name', statusName)
  }

  /**
   * 根据优先级查找数据项
   * @param {string} priority - 优先级
   * @returns {Array} 匹配的数据项数组
   */
  findByPriority(priority) {
    return this.findByIndex('priority', priority)
  }

  /**
   * 根据颜色编码查找数据项
   * @param {string} colorCode - 颜色编码
   * @returns {Array} 匹配的数据项数组
   */
  findByColorCode(colorCode) {
    return this.findByIndex('color_code', colorCode)
  }

  /**
   * 获取目标的当前状态
   * @param {string} targetId - 目标ID
   * @returns {Object|null} 当前状态数据
   */
  getCurrentStatus(targetId) {
    const statuses = this.findByTargetId(targetId)
    if (statuses.length === 0) return null

    const now = new Date()

    // 查找当前时间范围内的状态
    for (const status of statuses) {
      const startTime = status.start_time ? new Date(status.start_time) : null
      const endTime = status.end_time ? new Date(status.end_time) : null

      // 如果没有结束时间，或者当前时间在时间范围内
      if (!endTime || (startTime && startTime <= now && now <= endTime)) {
        return status
      }
    }

    // 如果没有找到当前状态，返回最新的状态
    return statuses.sort((a, b) => {
      const timeA = new Date(a.start_time || 0)
      const timeB = new Date(b.start_time || 0)
      return timeB - timeA
    })[0]
  }

  /**
   * 获取目标的状态历史
   * @param {string} targetId - 目标ID
   * @returns {Array} 状态历史数组（按时间排序）
   */
  getStatusHistory(targetId) {
    const statuses = this.findByTargetId(targetId)
    return statuses.sort((a, b) => {
      const timeA = new Date(a.start_time || 0)
      const timeB = new Date(b.start_time || 0)
      return timeA - timeB
    })
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
        item.target_id?.toLowerCase().includes(lowerKeyword) ||
        item.target_name?.toLowerCase().includes(lowerKeyword) ||
        item.status_type?.toLowerCase().includes(lowerKeyword) ||
        item.status_name?.toLowerCase().includes(lowerKeyword) ||
        item.description?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(item)
      }
    }

    return results
  }

  /**
   * 获取所有目标ID
   * @returns {Array} 目标ID数组
   */
  getAllTargetIds() {
    return this.getIndexValues('target_id')
  }

  /**
   * 获取所有状态类型
   * @returns {Array} 状态类型数组
   */
  getAllStatusTypes() {
    return this.getIndexValues('status_type')
  }

  /**
   * 获取所有状态名称
   * @returns {Array} 状态名称数组
   */
  getAllStatusNames() {
    return this.getIndexValues('status_name')
  }

  /**
   * 获取所有优先级
   * @returns {Array} 优先级数组
   */
  getAllPriorities() {
    return this.getIndexValues('priority')
  }

  /**
   * 获取所有颜色编码
   * @returns {Array} 颜色编码数组
   */
  getAllColorCodes() {
    return this.getIndexValues('color_code')
  }

  /**
   * 获取目标状态数据的时间范围
   * @returns {Object|null} 时间范围对象 {start: ISO8601字符串, end: ISO8601字符串} 或 null
   */
  getTimeRange() {
    const allData = this.getAll()
    if (allData.length === 0) {
      return null
    }

    let minTime = null
    let maxTime = null

    for (const item of allData) {
      // 检查 endTime 字段
      if (item.endTime && this.isValidDateTime(item.endTime)) {
        const endTime = new Date(item.endTime)
        if (!minTime || endTime < minTime) {
          minTime = endTime
        }
        if (!maxTime || endTime > maxTime) {
          maxTime = endTime
        }
      }

      // 检查 startTime 字段
      if (item.startTime && this.isValidDateTime(item.startTime)) {
        const startTime = new Date(item.startTime)
        if (!minTime || startTime < minTime) {
          minTime = startTime
        }
        if (!maxTime || startTime > maxTime) {
          maxTime = startTime
        }
      }
    }

    if (!minTime || !maxTime) {
      return null
    }

    return {
      start: minTime.toISOString(),
      end: maxTime.toISOString(),
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const baseStats = super.getStats()
    const timeRange = this.getTimeRange()

    return {
      ...baseStats,
      uniqueTargets: this.getAllTargetIds().length,
      statusTypes: this.getAllStatusTypes().length,
      priorities: this.getAllPriorities().length,
      timeRange,
    }
  }
}

export default TargetStatusManager
