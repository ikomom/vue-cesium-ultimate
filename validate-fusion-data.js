import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import FusionLineManager from './src/components/ui/sanbox/manager/FusionLineManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取融合线数据
const dataPath = join(__dirname, 'public', 'data', 'fusionLineData.json')
const fusionLineData = JSON.parse(readFileSync(dataPath, 'utf8'))

console.log('开始验证融合线数据...')
console.log(`总共 ${fusionLineData.length} 条融合线数据`)

// 创建融合线管理器
const manager = new FusionLineManager()

let validCount = 0
let invalidCount = 0

// 验证每条数据
for (const line of fusionLineData) {
  try {
    const result = manager.addItem(line)
    if (result) {
      validCount++
      console.log(`✓ 融合线 ${line.id} 验证通过`)
    } else {
      invalidCount++
      console.log(`✗ 融合线 ${line.id} 验证失败`)
    }
  } catch (error) {
    invalidCount++
    console.log(`✗ 融合线 ${line.id} 验证出错: ${error.message}`)
  }
}

console.log('\n验证结果:')
console.log(`有效数据: ${validCount}`)
console.log(`无效数据: ${invalidCount}`)

// 测试管理器功能
console.log('\n测试管理器功能:')

// 按类型查询
const communicationLines = manager.findByType('communication')
console.log(`通信线数量: ${communicationLines.length}`)

// 按状态查询
const activeLines = manager.findByStatus('active')
console.log(`活跃线数量: ${activeLines.length}`)

// 按优先级查询
const highPriorityLines = manager.findByPriority('high')
console.log(`高优先级线数量: ${highPriorityLines.length}`)

// 获取统计信息
const stats = manager.getFusionLineStats()
console.log('\n统计信息:')
console.log(`总数: ${stats.total}`)
console.log('按类型分布:', stats.byType)
console.log('按状态分布:', stats.byStatus)
console.log('按优先级分布:', stats.byPriority)

// 测试时间相关查询
console.log('\n测试时间相关功能:')
const allLines = manager.getAll()
const linesWithTime = allLines.filter(line => line.startTime && line.endTime)
console.log(`有时间信息的线数量: ${linesWithTime.length}`)

console.log('\n验证完成!')

export { manager, fusionLineData }