/**
 * 事件数据管理器
 * 管理事件数据，包括事件ID、源头ID、目标ID、事件描述、时间信息等
 */
import BaseManager from './BaseManager.js'

class EventManager extends BaseManager {
  constructor() {
    super()
    this.requiredFields = ['id', 'source_id', 'target_id', 'description', 'startTime']
    this.initializeIndexes()
  }

  /**
   * 初始化索引
   */
  initializeIndexes() {
    this.indexes.set('source_id', new Map())
    this.indexes.set('target_id', new Map())
    this.indexes.set('status', new Map()) // active, completed, pending
    this.indexes.set('eventType', new Map()) // 根据描述推断的事件类型
    this.indexes.set('dateRange', new Map()) // 按日期范围索引
  }

  /**
   * 自定义验证逻辑
   * @param {Object} item - 事件数据项
   * @returns {boolean} 是否有效
   */
  customValidation(item) {
    // 验证时间格式
    if (!this.isValidDateTime(item.startTime)) {
      console.error('事件开始时间格式无效:', item.startTime)
      return false
    }

    if (item.endTime && !this.isValidDateTime(item.endTime)) {
      console.error('事件结束时间格式无效:', item.endTime)
      return false
    }

    if (item.alertTime && !this.isValidDateTime(item.alertTime)) {
      console.error('事件预警时间格式无效:', item.alertTime)
      return false
    }

    // 验证时间逻辑
    if (item.endTime && new Date(item.startTime) > new Date(item.endTime)) {
      console.error('事件开始时间不能晚于结束时间:', item)
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
    if (!dateTime) return false
    const date = new Date(dateTime)
    return !isNaN(date.getTime())
  }

  /**
   * 更新索引
   * @param {Object} item - 事件数据项
   */
  updateIndexes(item) {
    this._updateIndex('source_id', item.source_id, item.id)
    this._updateIndex('target_id', item.target_id, item.id)

    // 根据事件类型建立索引（使用type字段）
    this._updateIndex('status', item.type, item.id)

    // 根据事件类型建立索引
    const eventType = this.inferEventType(item.description)
    this._updateIndex('eventType', eventType, item.id)

    // 按日期建立索引
    const dateKey = this.getDateKey(item.startTime)
    this._updateIndex('dateRange', dateKey, item.id)
  }

  /**
   * 从索引中移除数据项
   * @param {Object} item - 事件数据项
   */
  removeFromIndexes(item) {
    this._removeFromIndex('source_id', item.source_id, item.id)
    this._removeFromIndex('target_id', item.target_id, item.id)

    this._removeFromIndex('status', item.type, item.id)

    const eventType = this.inferEventType(item.description)
    this._removeFromIndex('eventType', eventType, item.id)

    const dateKey = this.getDateKey(item.startTime)
    this._removeFromIndex('dateRange', dateKey, item.id)
  }

  /**
   * 获取事件状态
   * @param {Object} event - 事件数据
   * @returns {string} 事件状态
   */
  getEventStatus(event) {
    const now = new Date()
    const startTime = new Date(event.startTime)
    const endTime = event.endTime ? new Date(event.endTime) : null

    if (endTime && now > endTime) {
      return 'completed'
    } else if (now >= startTime) {
      return 'active'
    } else {
      return 'pending'
    }
  }

  /**
   * 根据描述推断事件类型
   * @param {string} description - 事件描述
   * @returns {string} 事件类型
   */
  inferEventType(description) {
    const desc = description.toLowerCase()

    if (desc.includes('机场') || desc.includes('航班') || desc.includes('空域')) {
      return 'aviation'
    } else if (desc.includes('雷达') || desc.includes('通信') || desc.includes('信号')) {
      return 'communication'
    } else if (desc.includes('港') || desc.includes('船') || desc.includes('海')) {
      return 'maritime'
    } else if (desc.includes('站') || desc.includes('高铁') || desc.includes('铁路')) {
      return 'railway'
    } else if (desc.includes('军') || desc.includes('驱逐舰') || desc.includes('舰')) {
      return 'military'
    } else {
      return 'other'
    }
  }

  /**
   * 获取日期键（用于按日期索引）
   * @param {string} dateTime - 日期时间字符串
   * @returns {string} 日期键（YYYY-MM-DD格式）
   */
  getDateKey(dateTime) {
    const date = new Date(dateTime)
    return date.toISOString().split('T')[0]
  }

  /**
   * 根据源头ID查找事件
   * @param {string} sourceId - 源头ID
   * @returns {Array} 匹配的事件数组
   */
  findBySourceId(sourceId) {
    return this.findByIndex('source_id', sourceId)
  }

  /**
   * 根据目标ID查找事件
   * @param {string} targetId - 目标ID
   * @returns {Array} 匹配的事件数组
   */
  findByTargetId(targetId) {
    return this.findByIndex('target_id', targetId)
  }

  /**
   * 根据事件状态查找事件
   * @param {string} status - 事件状态 (active, completed, pending)
   * @returns {Array} 匹配的事件数组
   */
  findByStatus(status) {
    return this.findByIndex('status', status)
  }

  /**
   * 根据事件类型查找事件
   * @param {string} eventType - 事件类型
   * @returns {Array} 匹配的事件数组
   */
  findByEventType(eventType) {
    return this.findByIndex('eventType', eventType)
  }

  /**
   * 根据日期范围查找事件
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Array} 匹配的事件数组
   */
  findByDateRange(startDate, endDate) {
    const results = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (const event of this.data.values()) {
      const eventDate = new Date(event.startTime)
      if (eventDate >= start && eventDate <= end) {
        results.push(event)
      }
    }

    return results
  }

  /**
   * 查找涉及特定目标的所有事件（作为源头或目标）
   * @param {string} targetId - 目标ID
   * @returns {Array} 匹配的事件数组
   */
  findByTargetInvolved(targetId) {
    const sourceEvents = this.findBySourceId(targetId)
    const targetEvents = this.findByTargetId(targetId)

    // 合并并去重
    const allEvents = [...sourceEvents, ...targetEvents]
    const uniqueEvents = allEvents.filter(
      (event, index, self) => index === self.findIndex((e) => e.id === event.id),
    )

    return uniqueEvents
  }

  /**
   * 获取活跃事件（正在进行中的事件）
   * @returns {Array} 活跃事件数组
   */
  getActiveEvents() {
    return this.findByStatus('进行中')
  }

  /**
   * 获取待处理事件（尚未开始的事件）
   * @returns {Array} 待处理事件数组
   */
  getPendingEvents() {
    return this.findByStatus('待处理')
  }

  /**
   * 获取已完成事件
   * @returns {Array} 已完成事件数组
   */
  getCompletedEvents() {
    return this.findByStatus('已完成')
  }

  /**
   * 获取需要预警的事件（预警时间已到但事件尚未开始）
   * @returns {Array} 需要预警的事件数组
   */
  getAlertEvents() {
    return this.findByStatus('预警中')
  }

  /**
   * 模糊搜索事件
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的事件数组
   */
  search(keyword) {
    if (!keyword) return this.getAll()

    const lowerKeyword = keyword.toLowerCase()
    const results = []

    for (const event of this.data.values()) {
      if (
        event.id?.toLowerCase().includes(lowerKeyword) ||
        event.description?.toLowerCase().includes(lowerKeyword) ||
        event.source_id?.toLowerCase().includes(lowerKeyword) ||
        event.target_id?.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(event)
      }
    }

    return results
  }

  /**
   * 获取所有事件类型
   * @returns {Array} 事件类型数组
   */
  getAllEventTypes() {
    return this.getIndexValues('eventType')
  }

  /**
   * 获取所有事件状态
   * @returns {Array} 事件状态数组
   */
  getAllStatuses() {
    return this.getIndexValues('status')
  }

  /**
   * 获取事件统计信息
   * @returns {Object} 统计信息
   */
  getEventStats() {
    const baseStats = this.getStats()
    const eventStats = {
      ...baseStats,
      byStatus: {
        进行中: this.getActiveEvents().length,
        待处理: this.getPendingEvents().length,
        已完成: this.getCompletedEvents().length,
        预警中: this.getAlertEvents().length,
      },
      byType: {},
    }

    // 按类型统计
    const eventTypes = this.getAllEventTypes()
    eventTypes.forEach((type) => {
      eventStats.byType[type] = this.findByEventType(type).length
    })

    return eventStats
  }
}

export default EventManager
