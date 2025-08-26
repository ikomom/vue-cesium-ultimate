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

// 合并基础数据和位置数据
function mergeTargetData(baseData, locationData) {
  const locationMap = new Map()
  locationData.forEach((item) => {
    locationMap.set(item.id, item)
  })

  return baseData
    .map((baseItem) => {
      const locationItem = locationMap.get(baseItem.id)
      if (locationItem) {
        return {
          id: baseItem.id,
          name: baseItem.name,
          type: baseItem.type,
          description: baseItem.description,
          status: baseItem.status,
          capacity: baseItem.capacity,
          operator: baseItem.operator,
          longitude: locationItem.longitude,
          latitude: locationItem.latitude,
          height: locationItem.height,
          region: locationItem.region,
          province: locationItem.province,
          city: locationItem.city,
          address: locationItem.address,
          created_at: new Date(baseItem.createdAt),
        }
      }
      return null
    })
    .filter((item) => item !== null)
}

// 导入数据到数据库
async function importTargetsData(connection, data) {
  const insertQuery = `
    INSERT INTO targets (
      id, name, type, description, status, capacity, operator,
      longitude, latitude, height, region, province, city, address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      type = VALUES(type),
      description = VALUES(description),
      status = VALUES(status),
      capacity = VALUES(capacity),
      operator = VALUES(operator),
      longitude = VALUES(longitude),
      latitude = VALUES(latitude),
      height = VALUES(height),
      region = VALUES(region),
      province = VALUES(province),
      city = VALUES(city),
      address = VALUES(address),
      updated_at = CURRENT_TIMESTAMP
  `

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (const item of data) {
    try {
      await connection.execute(insertQuery, [
        item.id,
        item.name,
        item.type,
        item.description,
        item.status,
        item.capacity,
        item.operator,
        item.longitude,
        item.latitude,
        item.height,
        item.region,
        item.province,
        item.city,
        item.address,
        item.created_at,
      ])
      successCount++
    } catch (error) {
      errorCount++
      errors.push({ id: item.id, error: error.message })
      console.error(`导入记录 ${item.id} 失败:`, error.message)
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
    console.log('开始数据导入...')

    // 连接数据库
    connection = await mysql.createConnection(dbConfig)
    console.log('数据库连接成功')

    // 读取JSON文件
    const __filename = new URL(import.meta.url).pathname
    const __dirname = path.dirname(__filename.replace(/^\/([A-Za-z]:)/, '$1')) // 修复Windows路径
    const baseDataPath = path.join(__dirname, '../public/data/targetBaseData.json')
    const locationDataPath = path.join(__dirname, '../public/data/targetLocationData.json')
    
    console.log('基础数据文件路径:', baseDataPath)
    console.log('位置数据文件路径:', locationDataPath)

    const baseData = readJsonFile(baseDataPath)
    const locationData = readJsonFile(locationDataPath)

    if (!baseData || !locationData) {
      throw new Error('读取JSON文件失败')
    }

    console.log(`读取基础数据: ${baseData.length} 条`)
    console.log(`读取位置数据: ${locationData.length} 条`)

    // 合并数据
    const mergedData = mergeTargetData(baseData, locationData)
    console.log(`合并后数据: ${mergedData.length} 条`)

    // 导入数据
    console.log('开始导入targets表...')
    const result = await importTargetsData(connection, mergedData)

    console.log(`导入完成: 成功 ${result.successCount} 条, 失败 ${result.errorCount} 条`)

    // 记录导入日志
    await logImport(
      connection,
      'targetBaseData.json + targetLocationData.json',
      'json',
      mergedData.length,
      result.successCount,
      result.errorCount,
      result.errors.length > 0 ? JSON.stringify(result.errors) : null,
    )

    console.log('数据导入完成!')
  } catch (error) {
    console.error('导入过程中发生错误:', error.message)
  } finally {
    if (connection) {
      await connection.end()
      console.log('数据库连接已关闭')
    }
  }
}

// 运行主函数
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}

// 直接运行主函数（用于调试）
main();

export { main, mergeTargetData, importTargetsData }
