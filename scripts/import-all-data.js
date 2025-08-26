import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

// 数据库配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'example',
  database: 'vue_cesium_data',
}

// 读取JSON文件
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`读取文件 ${filePath} 失败:`, error.message)
    return null
  }
}

// 导入目标状态数据
async function importTargetStatusData(connection, data) {
  const insertQuery = `
    INSERT INTO target_status (
      id, target_id, target_name, status_type, status_name, start_time,
      color_code, icon_state, animation_effect, priority, description, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      target_name = VALUES(target_name),
      status_type = VALUES(status_type),
      status_name = VALUES(status_name),
      start_time = VALUES(start_time),
      color_code = VALUES(color_code),
      icon_state = VALUES(icon_state),
      animation_effect = VALUES(animation_effect),
      priority = VALUES(priority),
      description = VALUES(description),
      metadata = VALUES(metadata)
  `

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const item of data) {
    try {
      await connection.execute(insertQuery, [
        item.id,
        item.target_id,
        item.target_name,
        item.status_type,
        item.status_name,
        new Date(item.startTime),
        item.colorCode,
        item.iconState,
        item.animationEffect,
        item.priority,
        item.description,
        JSON.stringify(item.metadata || {}),
      ])
      successCount++
    } catch (error) {
      errorCount++
      errors.push({ id: item.id, error: error.message })
      console.error(`导入目标状态记录 ${item.id} 失败:`, error.message)
    }
  }

  return { successCount, errorCount, errors }
}

// 导入事件数据
async function importEventData(connection, data) {
  const insertQuery = `
    INSERT INTO events (
      id, source_id, target_id, description, start_time, end_time,
      alert_time, duration, type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      source_id = VALUES(source_id),
      target_id = VALUES(target_id),
      description = VALUES(description),
      start_time = VALUES(start_time),
      end_time = VALUES(end_time),
      alert_time = VALUES(alert_time),
      duration = VALUES(duration),
      type = VALUES(type)
  `

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const item of data) {
    try {
      await connection.execute(insertQuery, [
        item.id,
        item.source_id,
        item.target_id,
        item.description,
        new Date(item.startTime),
        item.endTime ? new Date(item.endTime) : null,
        item.alertTime ? new Date(item.alertTime) : null,
        item.duration,
        item.type,
      ])
      successCount++
    } catch (error) {
      errorCount++
      errors.push({ id: item.id, error: error.message })
      console.error(`导入事件记录 ${item.id} 失败:`, error.message)
    }
  }

  return { successCount, errorCount, errors }
}

// 导入关系数据
async function importRelationData(connection, data) {
  const insertQuery = `
    INSERT INTO relations (
      id, description, source_id, target_id, type, status,
      priority, distance, capacity, frequency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      description = VALUES(description),
      source_id = VALUES(source_id),
      target_id = VALUES(target_id),
      type = VALUES(type),
      status = VALUES(status),
      priority = VALUES(priority),
      distance = VALUES(distance),
      capacity = VALUES(capacity),
      frequency = VALUES(frequency)
  `

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const item of data) {
    try {
      await connection.execute(insertQuery, [
        item.id,
        item.description,
        item.source_id,
        item.target_id,
        item.type,
        item.status,
        item.priority,
        item.distance,
        item.capacity,
        item.frequency,
      ])
      successCount++
    } catch (error) {
      errorCount++
      errors.push({ id: item.id, error: error.message })
      console.error(`导入关系记录 ${item.id} 失败:`, error.message)
    }
  }

  return { successCount, errorCount, errors }
}

// 导入轨迹数据
async function importTrajectoryData(connection, data) {
  const insertQuery = `
    INSERT INTO trajectories (
      target_id, timestamp, longitude, latitude, altitude,
      speed, heading, status, location
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  let successCount = 0
  let errorCount = 0
  const errors = []

  // 遍历每个目标的轨迹数据
  for (const targetId in data) {
    if (Array.isArray(data[targetId])) {
      for (const item of data[targetId]) {
        try {
          await connection.execute(insertQuery, [
            targetId,
            new Date(item.timestamp),
            item.longitude,
            item.latitude,
            item.altitude,
            item.speed,
            item.heading,
            item.status,
            item.location,
          ])
          successCount++
        } catch (error) {
          errorCount++
          errors.push({ targetId: targetId, timestamp: item.timestamp, error: error.message })
          console.error(`导入轨迹记录失败:`, error.message)
        }
      }
    }
  }

  return { successCount, errorCount, errors }
}

// 记录导入日志
async function logImport(
  connection,
  fileName,
  fileType,
  totalRecords,
  successRecords,
  failedRecords,
  errorMessage = null,
) {
  const logQuery = `
    INSERT INTO import_logs (
      file_name, file_type, total_records, success_records, failed_records,
      error_message, start_time, end_time, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const startTime = new Date()
  const endTime = new Date()
  const status = failedRecords > 0 ? 'partial_success' : 'success'

  await connection.execute(logQuery, [
    fileName,
    fileType,
    totalRecords,
    successRecords,
    failedRecords,
    errorMessage,
    startTime,
    endTime,
    status,
  ])
}

// 主函数
async function main() {
  let connection

  try {
    console.log('开始导入所有数据...')

    // 连接数据库
    connection = await mysql.createConnection(dbConfig)
    console.log('数据库连接成功')

    // 获取数据文件路径
    const __filename = new URL(import.meta.url).pathname
    const __dirname = path.dirname(__filename.replace(/^\/([A-Za-z]:)/, '$1'))
    const dataDir = path.join(__dirname, '../public/data')

    // 导入目标状态数据
    console.log('\n=== 导入目标状态数据 ===')
    const statusDataPath = path.join(dataDir, 'targetStatusData.json')
    const statusData = readJsonFile(statusDataPath)
    if (statusData) {
      console.log(`读取目标状态数据: ${statusData.length} 条`)
      const statusResult = await importTargetStatusData(connection, statusData)
      console.log(
        `导入完成: 成功 ${statusResult.successCount} 条, 失败 ${statusResult.errorCount} 条`,
      )
      await logImport(
        connection,
        'targetStatusData.json',
        'json',
        statusData.length,
        statusResult.successCount,
        statusResult.errorCount,
      )
    }

    // 导入事件数据
    console.log('\n=== 导入事件数据 ===')
    const eventDataPath = path.join(dataDir, 'eventData.json')
    const eventData = readJsonFile(eventDataPath)
    if (eventData) {
      console.log(`读取事件数据: ${eventData.length} 条`)
      const eventResult = await importEventData(connection, eventData)
      console.log(
        `导入完成: 成功 ${eventResult.successCount} 条, 失败 ${eventResult.errorCount} 条`,
      )
      await logImport(
        connection,
        'eventData.json',
        'json',
        eventData.length,
        eventResult.successCount,
        eventResult.errorCount,
      )
    }

    // 导入关系数据
    console.log('\n=== 导入关系数据 ===')
    const relationDataPath = path.join(dataDir, 'relationData.json')
    const relationData = readJsonFile(relationDataPath)
    if (relationData) {
      console.log(`读取关系数据: ${relationData.length} 条`)
      const relationResult = await importRelationData(connection, relationData)
      console.log(
        `导入完成: 成功 ${relationResult.successCount} 条, 失败 ${relationResult.errorCount} 条`,
      )
      await logImport(
        connection,
        'relationData.json',
        'json',
        relationData.length,
        relationResult.successCount,
        relationResult.errorCount,
      )
    }

    // 导入轨迹数据
    console.log('\n=== 导入轨迹数据 ===')
    const trajectoryDataPath = path.join(dataDir, 'shipTrajectoryData.json')
    const trajectoryData = readJsonFile(trajectoryDataPath)
    if (trajectoryData) {
      // 计算总记录数
      let totalRecords = 0
      for (const targetId in trajectoryData) {
        if (Array.isArray(trajectoryData[targetId])) {
          totalRecords += trajectoryData[targetId].length
        }
      }
      console.log(`读取轨迹数据: ${totalRecords} 条`)
      const trajectoryResult = await importTrajectoryData(connection, trajectoryData)
      console.log(
        `导入完成: 成功 ${trajectoryResult.successCount} 条, 失败 ${trajectoryResult.errorCount} 条`,
      )
      await logImport(
        connection,
        'shipTrajectoryData.json',
        'json',
        totalRecords,
        trajectoryResult.successCount,
        trajectoryResult.errorCount,
      )
    }

    console.log('\n所有数据导入完成!')
  } catch (error) {
    console.error('导入过程中发生错误:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('数据库连接已关闭')
    }
  }
}

// 直接运行主函数
main()

export { main }
