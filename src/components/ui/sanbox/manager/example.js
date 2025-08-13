/**
 * 数据管理器使用示例
 * 展示如何使用三个数据管理类进行数据操作
 */

import { dataManagerFactory } from './index.js'

/**
 * 示例：基本使用方法
 */
export async function basicUsageExample() {
  try {
    // 方法1：从URL加载数据并创建管理器
    const managers = await dataManagerFactory.createManagersFromUrls(
      '/data/targetBaseData.json',
      '/data/targetLocationData.json', 
      '/data/relationshipData.json'
    )

    const { targetBaseManager, targetLocationManager, relationManager } = managers

    console.log('=== 基础数据管理器示例 ===')
    // 查找特定类型的目标
    const airports = targetBaseManager.findByType('机场')
    console.log('机场数量:', airports.length)

    // 查找特定状态的目标
    const activeTargets = targetBaseManager.findByStatus('运行中')
    console.log('运行中的目标:', activeTargets.length)

    // 模糊搜索
    const beijingTargets = targetBaseManager.fuzzySearch('北京')
    console.log('包含"北京"的目标:', beijingTargets.length)

    console.log('=== 位置数据管理器示例 ===')
    // 查找特定区域的目标
    const northTargets = targetLocationManager.findByRegion('华北')
    console.log('华北地区目标:', northTargets.length)

    // 查找特定省份的目标
    const beijingLocations = targetLocationManager.findByProvince('北京市')
    console.log('北京市目标:', beijingLocations.length)

    // 范围查询（北京周边100公里）
    const nearbyTargets = targetLocationManager.findByRadius(116.4074, 39.9042, 100000)
    console.log('北京周边100公里目标:', nearbyTargets.length)

    console.log('=== 关系数据管理器示例 ===')
    // 查找特定类型的关系
    const flights = relationManager.findByType('航线连接')
    console.log('航线连接数量:', flights.length)

    // 查找从特定目标出发的关系
    const fromBeijing = relationManager.findBySource('target_001')
    console.log('从target_001出发的关系:', fromBeijing.length)

    // 查找到特定目标的关系
    const toShanghai = relationManager.findByTarget('target_002')
    console.log('到target_002的关系:', toShanghai.length)

    // 获取网络统计信息
    const networkStats = relationManager.getNetworkStats()
    console.log('网络统计:', networkStats)

    return { targetBaseManager, targetLocationManager, relationManager }
  } catch (error) {
    console.error('示例执行失败:', error)
    throw error
  }
}

/**
 * 示例：数据更新和删除操作
 */
export function dataManipulationExample(managers) {
  const { targetBaseManager, targetLocationManager, relationManager } = managers

  console.log('=== 数据操作示例 ===')

  // 添加新的目标基础数据
  const newBaseData = {
    id: 'target_new_001',
    name: '测试机场',
    type: '机场',
    description: '这是一个测试机场',
    status: '建设中',
    capacityLevel: 'C',
    operator: '测试运营商',
    createdAt: new Date().toISOString()
  }
  targetBaseManager.addOrUpdate(newBaseData)
  console.log('添加新目标后总数:', targetBaseManager.getCount())

  // 添加对应的位置数据
  const newLocationData = {
    id: 'target_new_001',
    longitude: 116.5,
    latitude: 39.8,
    altitude: 50,
    region: '华北',
    province: '北京市',
    city: '朝阳区',
    address: '测试地址'
  }
  targetLocationManager.addOrUpdate(newLocationData)
  console.log('添加新位置后总数:', targetLocationManager.getCount())

  // 添加新的关系数据
  const newRelationData = {
    id: 'relation_new_001',
    description: '测试连接',
    sourceId: 'target_001',
    targetId: 'target_new_001',
    type: '航线连接',
    status: '激活',
    priority: 'high',
    capacity: 100,
    distance: 50.5,
    createdAt: new Date().toISOString()
  }
  relationManager.addOrUpdate(newRelationData)
  console.log('添加新关系后总数:', relationManager.getCount())

  // 更新数据（去重测试）
  const updatedBaseData = { ...newBaseData, status: '运行中' }
  targetBaseManager.addOrUpdate(updatedBaseData)
  console.log('更新后状态:', targetBaseManager.findById('target_new_001')?.status)

  // 删除数据
  targetBaseManager.delete('target_new_001')
  targetLocationManager.delete('target_new_001')
  relationManager.delete('relation_new_001')
  console.log('删除后基础数据总数:', targetBaseManager.getCount())
  console.log('删除后位置数据总数:', targetLocationManager.getCount())
  console.log('删除后关系数据总数:', relationManager.getCount())
}

/**
 * 示例：批量添加数据操作
 */
export function batchAddExample(managers) {
  const { targetBaseManager, targetLocationManager, relationManager } = managers

  console.log('=== 批量添加数据示例 ===')

  // 批量添加基础数据
  const batchBaseData = [
    {
      id: 'target_batch_001',
      name: '批量测试机场1',
      type: '机场',
      description: '批量添加的测试机场1',
      status: '运行中',
      capacityLevel: 'A',
      operator: '测试航空公司',
      createdAt: new Date().toISOString()
    },
    {
      id: 'target_batch_002',
      name: '批量测试港口1',
      type: '港口',
      description: '批量添加的测试港口1',
      status: '运行中',
      capacityLevel: 'B',
      operator: '测试港务局',
      createdAt: new Date().toISOString()
    },
    {
      // 故意添加一个无效数据测试错误处理
      name: '无效数据',
      type: '机场'
    }
  ]

  const baseResult = targetBaseManager.addItems(batchBaseData)
  console.log('批量添加基础数据结果:', baseResult)

  // 批量添加位置数据
  const batchLocationData = [
    {
      id: 'target_batch_001',
      longitude: 116.6,
      latitude: 39.9,
      altitude: 60,
      region: '华北',
      province: '北京市',
      city: '顺义区',
      address: '批量测试地址1'
    },
    {
      id: 'target_batch_002',
      longitude: 121.5,
      latitude: 31.2,
      altitude: 10,
      region: '华东',
      province: '上海市',
      city: '浦东新区',
      address: '批量测试地址2'
    },
    {
      // 故意添加一个无效坐标测试错误处理
      id: 'target_batch_003',
      longitude: 'invalid',
      latitude: 'invalid'
    }
  ]

  const locationResult = targetLocationManager.addItems(batchLocationData)
  console.log('批量添加位置数据结果:', locationResult)

  // 批量添加关系数据
  const batchRelationData = [
    {
      id: 'relation_batch_001',
      description: '批量测试连接1',
      sourceId: 'target_batch_001',
      targetId: 'target_batch_002',
      type: '航线连接',
      status: '激活',
      priority: 'high',
      capacity: 150,
      distance: 1200.5,
      createdAt: new Date().toISOString()
    },
    {
      id: 'relation_batch_002',
      description: '批量测试连接2',
      sourceId: 'target_001',
      targetId: 'target_batch_001',
      type: '雷达覆盖',
      status: '激活',
      priority: 'medium',
      capacity: 80,
      distance: 50.0,
      createdAt: new Date().toISOString()
    },
    {
      // 故意添加一个无效关系测试错误处理
      id: 'relation_batch_003',
      description: '无效关系'
      // 缺少sourceId和targetId
    }
  ]

  const relationResult = relationManager.addItems(batchRelationData)
  console.log('批量添加关系数据结果:', relationResult)

  // 清理测试数据
  targetBaseManager.delete('target_batch_001')
  targetBaseManager.delete('target_batch_002')
  targetLocationManager.delete('target_batch_001')
  targetLocationManager.delete('target_batch_002')
  relationManager.delete('relation_batch_001')
  relationManager.delete('relation_batch_002')

  console.log('批量添加示例完成，测试数据已清理')
}

/**
 * 示例：高级查询操作
 */
export function advancedQueryExample(managers) {
  const { targetBaseManager, targetLocationManager, relationManager } = managers

  console.log('=== 高级查询示例 ===')

  // 组合查询：查找华北地区的运行中机场
  const northRegionTargets = targetLocationManager.findByRegion('华北')
  const northRegionIds = northRegionTargets.map(t => t.id)
  const activeAirports = targetBaseManager.findByType('机场')
    .filter(t => t.status === '运行中' && northRegionIds.includes(t.id))
  console.log('华北地区运行中的机场:', activeAirports.length)

  // 空间查询：查找指定范围内的目标
  const boundsTargets = targetLocationManager.findByBounds(116.0, 39.0, 117.0, 40.0)
  console.log('指定范围内的目标:', boundsTargets.length)

  // 网络分析：查找高优先级的关系
  const highPriorityRelations = relationManager.findByPriority('high')
  console.log('高优先级关系:', highPriorityRelations.length)

  // 容量分析：查找大容量关系
  const highCapacityRelations = relationManager.findByCapacityRange(80, 200)
  console.log('大容量关系:', highCapacityRelations.length)

  // 距离分析：查找长距离关系
  const longDistanceRelations = relationManager.findByDistanceRange(100, 1000)
  console.log('长距离关系:', longDistanceRelations.length)

  // 获取统计信息
  const allStats = dataManagerFactory.getAllStats()
  console.log('全局统计信息:', allStats)
}

/**
 * 示例：数据导入导出
 */
export function importExportExample(managers) {
  const { targetBaseManager, targetLocationManager, relationManager } = managers

  console.log('=== 导入导出示例 ===')

  // 导出数据
  const baseDataJson = targetBaseManager.exportToJson()
  const locationDataJson = targetLocationManager.exportToJson()
  const relationDataJson = relationManager.exportToJson()

  console.log('导出基础数据长度:', baseDataJson.length)
  console.log('导出位置数据长度:', locationDataJson.length)
  console.log('导出关系数据长度:', relationDataJson.length)

  // 清空数据
  targetBaseManager.clear()
  targetLocationManager.clear()
  relationManager.clear()
  console.log('清空后数据量:', {
    base: targetBaseManager.getCount(),
    location: targetLocationManager.getCount(),
    relation: relationManager.getCount()
  })

  // 重新导入数据
  targetBaseManager.importFromJson(baseDataJson)
  targetLocationManager.importFromJson(locationDataJson)
  relationManager.importFromJson(relationDataJson)
  console.log('重新导入后数据量:', {
    base: targetBaseManager.getCount(),
    location: targetLocationManager.getCount(),
    relation: relationManager.getCount()
  })
}

/**
 * 完整示例运行函数
 */
export async function runAllExamples() {
  try {
    console.log('开始运行数据管理器示例...')
    
    // 基本使用示例
    const managers = await basicUsageExample()
    
    // 数据操作示例
    dataManipulationExample(managers)
    
    // 批量添加示例
    batchAddExample(managers)
    
    // 高级查询示例
    advancedQueryExample(managers)
    
    // 导入导出示例
    importExportExample(managers)
    
    console.log('所有示例运行完成！')
    return managers
  } catch (error) {
    console.error('示例运行失败:', error)
    throw error
  }
}

// 默认导出
export default {
  basicUsageExample,
  dataManipulationExample,
  batchAddExample,
  advancedQueryExample,
  importExportExample,
  runAllExamples
}