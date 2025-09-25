import FusionLineManager from './FusionLineManager.js'

/**
 * 测试融合线管理器功能
 */
function testFusionLineManager() {
  console.log('开始测试 FusionLineManager...')

  const manager = new FusionLineManager()

  // 测试数据
  const testLines = [
    {
      id: 'line_001',
      name: '通信链路A',
      type: 'communication',
      status: 'active',
      priority: 'high',
      style_type: 'solid',
      layer_id: 'layer_1',
      source_target_id: 'target_001',
      destination_target_id: 'target_002',
      start_point: { longitude: 116.3974, latitude: 39.9093 }, // 北京
      end_point: { longitude: 121.4737, latitude: 31.2304 }, // 上海
      description: '北京到上海的通信链路',
      capacity: '10Gbps',
      frequency: '2.4GHz',
    },
    {
      id: 'line_002',
      name: '数据传输B',
      type: 'data_transfer',
      status: 'standby',
      priority: 'medium',
      style_type: 'dashed',
      layer_id: 'layer_1',
      source_target_id: 'target_002',
      destination_target_id: 'target_003',
      start_point: { longitude: 121.4737, latitude: 31.2304 }, // 上海
      end_point: { longitude: 113.2644, latitude: 23.1291 }, // 广州
      path_points: [
        { longitude: 118.7969, latitude: 32.0603 }, // 南京
        { longitude: 120.1551, latitude: 30.2741 }, // 杭州
      ],
      description: '上海到广州的数据传输线路',
      capacity: '5Gbps',
      frequency: '5GHz',
    },
    {
      id: 'line_003',
      name: '控制信号C',
      type: 'control_signal',
      status: 'error',
      priority: 'low',
      style_type: 'dotted',
      layer_id: 'layer_2',
      source_target_id: 'target_001',
      destination_target_id: 'target_003',
      start_point: { longitude: 116.3974, latitude: 39.9093 }, // 北京
      end_point: { longitude: 113.2644, latitude: 23.1291 }, // 广州
      description: '北京到广州的控制信号',
      capacity: '1Gbps',
      frequency: '1GHz',
    },
  ]

  // 测试添加数据
  console.log('\n=== 测试添加数据 ===')
  const addResult = manager.addItems(testLines)
  console.log('添加结果:', addResult)
  console.log('总数据量:', manager.getCount())

  // 测试基本查询
  console.log('\n=== 测试基本查询 ===')
  console.log('根据ID查找 line_001:', manager.findById('line_001'))
  console.log('所有数据:', manager.getAll().map((item) => ({ id: item.id, name: item.name })))

  // 测试索引查询
  console.log('\n=== 测试索引查询 ===')
  console.log('通信类型线条:', manager.findByType('communication'))
  console.log('活跃状态线条:', manager.findByStatus('active'))
  console.log('高优先级线条:', manager.findByPriority('high'))
  console.log('实线样式线条:', manager.findByStyleType('solid'))
  console.log('图层1的线条:', manager.findByLayer('layer_1'))

  // 测试目标相关查询
  console.log('\n=== 测试目标相关查询 ===')
  console.log('源目标为 target_001 的线条:', manager.findBySourceTarget('target_001'))
  console.log('目标为 target_002 的线条:', manager.findByDestinationTarget('target_002'))
  console.log('与 target_001 相关的所有线条:', manager.findLinesByTarget('target_001'))
  console.log(
    'target_001 和 target_002 之间的线条:',
    manager.findLinesBetweenTargets('target_001', 'target_002'),
  )

  // 测试几何查询
  console.log('\n=== 测试几何查询 ===')
  console.log('长度在 500-2000km 的线条:', manager.findByLengthRange(500000, 2000000))

  const bounds = {
    minLon: 115,
    minLat: 30,
    maxLon: 122,
    maxLat: 40,
  }
  console.log('在指定区域内的线条:', manager.findByBounds(bounds))

  const centerPoint = { longitude: 118, latitude: 32 }
  console.log(
    '距离南京500km内的线条:',
    manager.findByDistanceFromPoint(centerPoint, 500000),
  )

  // 测试搜索功能
  console.log('\n=== 测试搜索功能 ===')
  console.log('搜索"通信":', manager.search('通信'))
  console.log('搜索"北京":', manager.search('北京'))

  // 测试统计功能
  console.log('\n=== 测试统计功能 ===')
  console.log('所有类型:', manager.getAllTypes())
  console.log('所有状态:', manager.getAllStatuses())
  console.log('所有优先级:', manager.getAllPriorities())
  console.log('所有样式类型:', manager.getAllStyleTypes())
  console.log('所有图层:', manager.getAllLayers())

  const stats = manager.getFusionLineStats()
  console.log('融合线统计信息:', stats)

  // 测试更新功能
  console.log('\n=== 测试更新功能 ===')
  const updatedLine = {
    ...testLines[0],
    status: 'maintenance',
    description: '更新后的描述',
  }
  manager.addItem(updatedLine)
  console.log('更新后的 line_001:', manager.findById('line_001'))

  // 测试删除功能
  console.log('\n=== 测试删除功能 ===')
  console.log('删除前数量:', manager.getCount())
  const deleteResult = manager.deleteById('line_003')
  console.log('删除 line_003 结果:', deleteResult)
  console.log('删除后数量:', manager.getCount())

  // 测试批量删除
  console.log('删除与 target_001 相关的所有线条数量:', manager.deleteByTarget('target_001'))
  console.log('最终数量:', manager.getCount())

  // 测试导出导入
  console.log('\n=== 测试导出导入 ===')
  manager.setInitialData(testLines) // 重新设置数据
  const exportedData = manager.exportToJSON()
  console.log('导出的JSON长度:', exportedData.length)

  const newManager = new FusionLineManager()
  const importResult = newManager.importFromJSON(exportedData)
  console.log('导入结果:', importResult)
  console.log('新管理器数据量:', newManager.getCount())

  // 测试验证功能
  console.log('\n=== 测试验证功能 ===')
  const invalidLines = [
    { id: 'invalid_1' }, // 缺少必要字段
    {
      id: 'invalid_2',
      type: 'test',
      start_point: { longitude: 200, latitude: 100 }, // 无效坐标
      end_point: { longitude: 116, latitude: 39 },
    },
    {
      id: 'invalid_3',
      type: 'test',
      start_point: { longitude: 116, latitude: 39 },
      end_point: { longitude: 116, latitude: 39 }, // 起点终点相同
    },
  ]

  const invalidResult = manager.addItems(invalidLines)
  console.log('添加无效数据结果:', invalidResult)

  console.log('\n测试完成！')
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  testFusionLineManager()
} else {
  // 浏览器环境，导出测试函数
  window.testFusionLineManager = testFusionLineManager
}

export { testFusionLineManager }