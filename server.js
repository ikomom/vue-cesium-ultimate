import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'public', 'data')

// 读取JSON文件的辅助函数
const readJsonFile = (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename)
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`读取文件 ${filename} 失败:`, error)
    return []
  }
}

// 时间过滤函数
const filterByTimeRange = (data, startTime, endTime, timeField = 'timestamp') => {
  if (!startTime && !endTime) return data

  return data.filter((item) => {
    const itemTime = new Date(item[timeField])
    const start = startTime ? new Date(startTime) : null
    const end = endTime ? new Date(endTime) : null

    if (start && end) {
      return itemTime >= start && itemTime <= end
    } else if (start) {
      return itemTime >= start
    } else if (end) {
      return itemTime <= end
    }
    return true
  })
}

// 根据target_ids过滤数据
const filterByTargetIds = (data, targetIds) => {
  if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
    return data
  }

  return data.filter((item) => {
    // 支持多种ID字段名
    const id = item.target_id || item.targetId || item.id || item.point_id
    return targetIds.includes(id)
  })
}

// API路由

// 获取目标基础数据
app.get('/targets', (req, res) => {
  try {
    const { target_ids } = req.query
    let data = readJsonFile('targetBaseData.json')

    // 解析target_ids参数
    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 应用过滤器 - 只过滤target_ids，不过滤时间
    data = filterByTargetIds(data, targetIds)

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { target_ids: targetIds },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取目标位置数据
app.get('/target-locations', (req, res) => {
  try {
    const { target_ids } = req.query
    let data = readJsonFile('targetLocationData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 应用过滤器 - 只过滤target_ids，不过滤时间
    data = filterByTargetIds(data, targetIds)

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { target_ids: targetIds },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取关系数据
app.get('/relations', (req, res) => {
  try {
    const { target_ids } = req.query
    let data = readJsonFile('relationData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 关系数据需要检查source和target字段 - 只过滤target_ids，不过滤时间
    if (targetIds && targetIds.length > 0) {
      data = data.filter(
        (item) => targetIds.includes(item.source) || targetIds.includes(item.target),
      )
    }

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { target_ids: targetIds },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取事件数据
app.get('/events', (req, res) => {
  try {
    const { startTime, endTime, target_ids } = req.query
    let data = readJsonFile('eventData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    data = filterByTargetIds(data, targetIds)
    data = filterByTimeRange(data, startTime, endTime, 'timestamp')

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { startTime, endTime, target_ids: targetIds },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取轨迹数据
app.get('/trajectories', (req, res) => {
  try {
    const { target_ids, startTime, endTime } = req.query
    let data = readJsonFile('shipTrajectoryData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 轨迹数据是对象格式，需要特殊处理 - 过滤target_ids和时间
    if (targetIds && targetIds.length > 0) {
      const filteredData = {}
      targetIds.forEach((id) => {
        if (data[id]) {
          filteredData[id] = data[id]
        }
      })
      data = filteredData
    }

    // 应用时间过滤 - 根据timestamp过滤轨迹点
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : null
      const end = endTime ? new Date(endTime) : null

      Object.keys(data).forEach((targetId) => {
        if (data[targetId] && Array.isArray(data[targetId])) {
          data[targetId] = data[targetId].filter((point) => {
            const pointTime = new Date(point.timestamp)
            if (start && end) {
              return pointTime >= start && pointTime <= end
            } else if (start) {
              return pointTime >= start
            } else if (end) {
              return pointTime <= end
            }
            return true
          })
        }
      })
    }

    res.json({
      success: true,
      data: data,
      count: Object.keys(data).length,
      filters: { target_ids: targetIds, startTime, endTime },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取目标状态数据
app.get('/target-status', (req, res) => {
  try {
    const { target_ids, startTime, endTime } = req.query
    let data = readJsonFile('targetStatusData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 应用过滤器 - 过滤target_ids和时间
    data = filterByTargetIds(data, targetIds)
    data = filterByTimeRange(data, startTime, endTime, 'startTime')

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { target_ids: targetIds, startTime, endTime },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 获取融合线数据
app.get('/fusion-lines', (req, res) => {
  try {
    const { startTime, endTime, target_ids } = req.query
    let data = readJsonFile('fusionLineData.json')

    const targetIds = target_ids ? JSON.parse(target_ids) : null

    // 融合线数据需要检查source_id和target_id字段（注意字段名）
    if (targetIds && targetIds.length > 0) {
      data = data.filter(
        (item) => targetIds.includes(item.source_id) || targetIds.includes(item.target_id),
      )
    }

    // 融合线数据使用startTime字段进行时间过滤
    data = filterByTimeRange(data, startTime, endTime, 'startTime')

    res.json({
      success: true,
      data: data,
      count: data.length,
      filters: { startTime, endTime, target_ids: targetIds },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 综合查询接口 - 一次性获取所有数据
app.post('/data', (req, res) => {
  try {
    const { startTime, endTime, target_ids } = req.body
    const targetIds = target_ids && Array.isArray(target_ids) ? target_ids : null

    // 读取所有数据文件
    let targetBaseData = readJsonFile('targetBaseData.json')
    let targetLocationData = readJsonFile('targetLocationData.json')
    let relationData = readJsonFile('relationData.json')
    let eventData = readJsonFile('eventData.json')
    let trajectoryData = readJsonFile('shipTrajectoryData.json')
    let targetStatusData = readJsonFile('targetStatusData.json')
    let fusionLineData = readJsonFile('fusionLineData.json')

    // 应用过滤器 - 只对target_ids过滤，不对时间过滤（除了事件和融合线）
    targetBaseData = filterByTargetIds(targetBaseData, targetIds)

    targetLocationData = filterByTargetIds(targetLocationData, targetIds)

    // 关系数据特殊处理 - 只过滤target_ids
    if (targetIds && targetIds.length > 0) {
      relationData = relationData.filter(
        (item) => targetIds.includes(item.source) || targetIds.includes(item.target),
      )
    }

    // 事件数据 - 应用时间过滤
    eventData = filterByTargetIds(eventData, targetIds)
    eventData = filterByTimeRange(eventData, startTime, endTime, 'timestamp')

    targetStatusData = filterByTargetIds(targetStatusData, targetIds)
    // 状态数据 - 应用时间过滤
    targetStatusData = filterByTimeRange(targetStatusData, startTime, endTime, 'startTime')

    // 轨迹数据特殊处理 - 过滤target_ids和时间
    if (targetIds && targetIds.length > 0) {
      const filteredTrajectoryData = {}
      targetIds.forEach((id) => {
        if (trajectoryData[id]) {
          filteredTrajectoryData[id] = trajectoryData[id]
        }
      })
      trajectoryData = filteredTrajectoryData
    }

    // 轨迹数据 - 应用时间过滤
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : null
      const end = endTime ? new Date(endTime) : null

      Object.keys(trajectoryData).forEach((targetId) => {
        if (trajectoryData[targetId] && Array.isArray(trajectoryData[targetId])) {
          trajectoryData[targetId] = trajectoryData[targetId].filter((point) => {
            const pointTime = new Date(point.timestamp)
            if (start && end) {
              return pointTime >= start && pointTime <= end
            } else if (start) {
              return pointTime >= start
            } else if (end) {
              return pointTime <= end
            }
            return true
          })
        }
      })
    }

    // 融合线数据 - 应用时间过滤
    if (targetIds && targetIds.length > 0) {
      fusionLineData = fusionLineData.filter(
        (item) => targetIds.includes(item.source_id) || targetIds.includes(item.target_id),
      )
    }
    fusionLineData = filterByTimeRange(fusionLineData, startTime, endTime, 'startTime')

    res.json({
      success: true,
      data: {
        targetBaseData,
        targetLocationData,
        relationData,
        eventData,
        trajectoryData,
        targetStatusData,
        fusionLineData,
      },
      filters: { startTime, endTime, target_ids: targetIds },
      counts: {
        targets: targetBaseData.length,
        locations: targetLocationData.length,
        relations: relationData.length,
        events: eventData.length,
        trajectories: Object.keys(trajectoryData).length,
        statuses: targetStatusData.length,
        fusionLines: fusionLineData.length,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务器运行正常',
    timestamp: new Date().toISOString(),
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Express API服务器已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`)
  console.log(`📊 综合查询: http://localhost:${PORT}/data`)
})
