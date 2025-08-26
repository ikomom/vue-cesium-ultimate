import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename).replace(/\\/g, '/')

// 数据库配置
const dbConfig = {
  host: 'localhost',
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

// 记录导入日志
async function logImport(
  connection,
  fileName,
  fileType,
  totalRecords,
  successRecords,
  failedRecords,
  startTime,
  endTime,
  status = 'completed',
  errorMessage = null,
) {
  const insertLogQuery = `
    INSERT INTO import_logs (file_name, file_type, total_records, success_records, failed_records, start_time, end_time, status, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `

  await connection.execute(insertLogQuery, [
    fileName,
    fileType,
    totalRecords,
    successRecords,
    failedRecords,
    startTime,
    endTime,
    status,
    errorMessage,
  ])
}

async function createMissingTargets() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    console.log('=== 创建缺失的目标记录 ===')

    // 读取轨迹数据
    const trajectoryDataPath = path.join(__dirname, '../public/data/shipTrajectoryData.json')
    const trajectoryData = readJsonFile(trajectoryDataPath)

    if (!trajectoryData) {
      console.log('无法读取轨迹数据文件')
      return
    }

    // 获取轨迹数据中的所有target_id
    const trajectoryTargetIds = Object.keys(trajectoryData)
    console.log(`轨迹数据中的目标ID: ${trajectoryTargetIds.join(', ')}`)

    // 查询已存在的目标ID
    const [existingTargets] = await connection.execute('SELECT id FROM targets')
    const existingTargetIds = existingTargets.map((row) => row.id)
    console.log(`已存在的目标ID: ${existingTargetIds.join(', ')}`)

    // 找出缺失的目标ID
    const missingTargetIds = trajectoryTargetIds.filter((id) => !existingTargetIds.includes(id))
    console.log(`缺失的目标ID: ${missingTargetIds.join(', ')}`)

    if (missingTargetIds.length === 0) {
      console.log('所有目标ID都已存在，无需创建')
      return
    }

    // 创建缺失的目标记录
    let successCount = 0
    let failedCount = 0
    const startTime = new Date()

    const insertQuery = `
      INSERT INTO targets (id, name, type, description, status, longitude, latitude, height, region, province, city, address, capacity, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `

    for (const targetId of missingTargetIds) {
      try {
        // 根据ID推断目标类型和基本信息
        let name, type, description
        if (targetId.includes('051')) {
          name = '货轮-东海航线'
          type = '货轮'
          description = '执行上海-大阪货运任务的大型货轮'
        } else if (targetId.includes('052')) {
          name = '货轮-长江航线'
          type = '货轮'
          description = '执行南京-台湾海峡货运任务的货轮'
        } else if (targetId.includes('053')) {
          name = '货轮-南海航线'
          type = '货轮'
          description = '执行广州-新加坡货运任务的货轮'
        } else if (targetId.includes('054')) {
          name = '军舰-黄海巡逻'
          type = '军舰'
          description = '执行黄海巡逻任务的军用舰艇'
        } else {
          name = `目标-${targetId}`
          type = '未知'
          description = `自动生成的目标记录-${targetId}`
        }

        await connection.execute(insertQuery, [
          targetId,
          name,
          type,
          description,
          '活跃',
          null,
          null,
          null, // longitude, latitude, height
          '未知',
          '未知',
          '未知',
          '未知', // region, province, city, address
          '未知',
          '系统自动生成', // capacity, operator
        ])

        console.log(`创建目标记录: ${targetId} - ${name}`)
        successCount++
      } catch (error) {
        console.log(`创建目标记录 ${targetId} 失败: ${error.message}`)
        failedCount++
      }
    }

    const endTime = new Date()
    console.log(`创建完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`)

    // 记录导入日志
    await logImport(
      connection,
      'missing-targets-creation',
      'system',
      missingTargetIds.length,
      successCount,
      failedCount,
      startTime,
      endTime,
    )
  } catch (error) {
    console.error('创建缺失目标记录过程中发生错误:', error.message)
  } finally {
    await connection.end()
    console.log('数据库连接已关闭')
  }
}

// 运行脚本
createMissingTargets()
