<template>
  <div class="cesium-render-demo">
    <!-- 演示区域 -->
    <div class="demo-section">
      <div class="demo-tabs">
        <button
          v-for="tab in demoTabs"
          :key="tab.key"
          :class="['tab-button', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="demo-content">
        <!-- 基础使用演示 -->
        <div v-if="activeTab === 'basic'" class="demo-panel">
          <h3>基础使用演示</h3>
          <div class="demo-description">
            <p>展示渲染引擎的基本功能，包括点位、轨迹、关系等数据类型的渲染。</p>
          </div>
          <div class="demo-actions">
            <button @click="loadBasicDemo" class="action-button primary">
              加载基础演示
            </button>
            <button @click="clearDemo" class="action-button">
              清空数据
            </button>
          </div>
          <div class="demo-stats" v-if="basicStats">
            <div class="stat-item">
              <span class="stat-label">实体数量:</span>
              <span class="stat-value">{{ basicStats.entityCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">FPS:</span>
              <span class="stat-value">{{ basicStats.fps }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">内存使用:</span>
              <span class="stat-value">{{ basicStats.memoryUsage }}MB</span>
            </div>
          </div>
        </div>

        <!-- 性能测试演示 -->
        <div v-if="activeTab === 'performance'" class="demo-panel">
          <h3>性能测试演示</h3>
          <div class="demo-description">
            <p>测试渲染引擎在不同数据量下的性能表现。</p>
          </div>
          <div class="performance-controls">
            <div class="control-group">
              <label>实体数量:</label>
              <select v-model="performanceTestCount">
                <option value="1000">1,000</option>
                <option value="5000">5,000</option>
                <option value="10000">10,000</option>
                <option value="20000">20,000</option>
                <option value="50000">50,000</option>
              </select>
            </div>
            <div class="control-group">
              <label>性能预设:</label>
              <select v-model="performancePreset">
                <option value="high-performance">高性能</option>
                <option value="balanced">平衡</option>
                <option value="high-quality">高质量</option>
              </select>
            </div>
          </div>
          <div class="demo-actions">
            <button @click="runPerformanceTest" class="action-button primary" :disabled="performanceTestRunning">
              {{ performanceTestRunning ? '测试中...' : '开始性能测试' }}
            </button>
            <button @click="stopPerformanceTest" class="action-button" :disabled="!performanceTestRunning">
              停止测试
            </button>
          </div>
          <div class="performance-results" v-if="performanceResults">
            <h4>测试结果</h4>
            <div class="result-grid">
              <div class="result-item">
                <span class="result-label">加载时间:</span>
                <span class="result-value">{{ performanceResults.loadTime }}ms</span>
              </div>
              <div class="result-item">
                <span class="result-label">平均 FPS:</span>
                <span class="result-value">{{ performanceResults.avgFps }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">内存峰值:</span>
                <span class="result-value">{{ performanceResults.peakMemory }}MB</span>
              </div>
              <div class="result-item">
                <span class="result-label">渲染调用:</span>
                <span class="result-value">{{ performanceResults.renderCalls }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 时间控制演示 -->
        <div v-if="activeTab === 'time'" class="demo-panel">
          <h3>时间控制演示</h3>
          <div class="demo-description">
            <p>展示时间范围过滤、时间动画播放等时间控制功能。</p>
          </div>
          <div class="time-controls">
            <div class="control-group">
              <label>开始时间:</label>
              <input type="datetime-local" v-model="timeRange.start">
            </div>
            <div class="control-group">
              <label>结束时间:</label>
              <input type="datetime-local" v-model="timeRange.end">
            </div>
            <div class="control-group">
              <label>播放速度:</label>
              <input type="range" v-model="timeSpeed" min="0.1" max="5" step="0.1">
              <span>{{ timeSpeed }}x</span>
            </div>
          </div>
          <div class="demo-actions">
            <button @click="loadTimeDemo" class="action-button primary">
              加载时间数据
            </button>
            <button @click="playTimeAnimation" class="action-button" :disabled="!timeDataLoaded">
              播放动画
            </button>
            <button @click="pauseTimeAnimation" class="action-button" :disabled="!timeDataLoaded">
              暂停动画
            </button>
            <button @click="stopTimeAnimation" class="action-button" :disabled="!timeDataLoaded">
              停止动画
            </button>
          </div>
          <div class="time-status" v-if="timeDataLoaded">
            <div class="status-item">
              <span class="status-label">当前时间:</span>
              <span class="status-value">{{ currentTime }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">动画状态:</span>
              <span class="status-value">{{ animationStatus }}</span>
            </div>
          </div>
        </div>

        <!-- 图层管理演示 -->
        <div v-if="activeTab === 'layers'" class="demo-panel">
          <h3>图层管理演示</h3>
          <div class="demo-description">
            <p>展示多图层创建、管理和联动功能。</p>
          </div>
          <div class="layer-controls">
            <div class="control-group">
              <label>图层名称:</label>
              <input type="text" v-model="newLayerName" placeholder="输入图层名称">
            </div>
            <div class="control-group">
              <label>图层类型:</label>
              <select v-model="newLayerType">
                <option value="point">点位</option>
                <option value="trajectory">轨迹</option>
                <option value="relation">关系</option>
                <option value="event">事件</option>
                <option value="area">区域</option>
                <option value="route">路线</option>
              </select>
            </div>
          </div>
          <div class="demo-actions">
            <button @click="createLayer" class="action-button primary" :disabled="!newLayerName">
              创建图层
            </button>
            <button @click="loadLayerDemo" class="action-button">
              加载演示图层
            </button>
          </div>
          <div class="layer-list" v-if="layers.length > 0">
            <h4>图层列表</h4>
            <div class="layer-item" v-for="layer in layers" :key="layer.name">
              <div class="layer-info">
                <span class="layer-name">{{ layer.name }}</span>
                <span class="layer-type">({{ layer.type }})</span>
                <span class="layer-count">{{ layer.entityCount }} 个实体</span>
              </div>
              <div class="layer-controls">
                <button
                  @click="toggleLayerVisibility(layer.name)"
                  :class="['control-button', { active: layer.visible }]"
                >
                  {{ layer.visible ? '隐藏' : '显示' }}
                </button>
                <button @click="removeLayer(layer.name)" class="control-button danger">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 渲染引擎容器 -->
    <div class="render-container">
      <CesiumRenderEngine
        ref="renderEngine"
        :cesium-config="cesiumConfig"
        :performance-preset="performancePreset"
        @layer-created="onLayerCreated"
        @layer-removed="onLayerRemoved"
        @data-updated="onDataUpdated"
        @performance-warning="onPerformanceWarning"
        @time-changed="onTimeChanged"
        @stats-updated="onStatsUpdated"
      />
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">引擎状态:</span>
        <span :class="['status-indicator', engineStatus.toLowerCase()]">{{ engineStatus }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">图层数量:</span>
        <span class="status-value">{{ layers.length }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">总实体数:</span>
        <span class="status-value">{{ totalEntities }}</span>
      </div>
      <div class="status-item" v-if="lastWarning">
        <span class="status-label">警告:</span>
        <span class="status-warning">{{ lastWarning }}</span>
      </div>
    </div>

        <!-- 功能特性展示 -->
    <div class="features-section">
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">🚀</div>
          <h3>高性能渲染</h3>
          <p>支持 10,000+ 实体同时渲染，采用 LOD、视锥剔除、批处理等优化策略</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔄</div>
          <h3>动态数据更新</h3>
          <p>实时数据流处理，时间范围过滤，支持时间动画播放控制</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎛️</div>
          <h3>图层管理</h3>
          <p>多图层独立控制，支持图层联动和数据共享机制</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>性能监控</h3>
          <p>实时 FPS、内存监控，自动性能优化和警告机制</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import CesiumRenderEngine from '@/components/cesium-render/CesiumRenderEngine.vue'

// 响应式数据
const renderEngine = ref(null)
const activeTab = ref('basic')
const engineStatus = ref('未初始化')
const lastWarning = ref('')

// 演示标签页
const demoTabs = [
  { key: 'basic', label: '基础使用' },
  { key: 'performance', label: '性能测试' },
  { key: 'time', label: '时间控制' },
  { key: 'layers', label: '图层管理' }
]

// Cesium 配置
const cesiumConfig = {
  terrainProvider: undefined,
  imageryProvider: undefined,
  camera: {
    destination: [116.404, 39.915, 1000000] // 北京上空
  },
  scene3DOnly: true,
  shouldAnimate: true
}

// 基础演示数据
const basicStats = ref(null)

// 性能测试数据
const performanceTestCount = ref('10000')
const performancePreset = ref('balanced')
const performanceTestRunning = ref(false)
const performanceResults = ref(null)

// 时间控制数据
const timeRange = reactive({
  start: '2024-01-01T00:00',
  end: '2024-01-01T23:59'
})
const timeSpeed = ref(1.0)
const timeDataLoaded = ref(false)
const currentTime = ref('')
const animationStatus = ref('停止')

// 图层管理数据
const newLayerName = ref('')
const newLayerType = ref('point')
const layers = ref([])

// 计算属性
const totalEntities = computed(() => {
  return layers.value.reduce((total, layer) => total + layer.entityCount, 0)
})

// 生命周期
onMounted(() => {
  engineStatus.value = '初始化中'
  setTimeout(() => {
    engineStatus.value = '就绪'
  }, 2000)
})

// 基础演示方法
const loadBasicDemo = async () => {
  try {
    const engine = renderEngine.value

    // 创建点位图层
    await engine.createLayer('demo-points', {
      type: 'point',
      style: {
        color: '#ff0000',
        size: 10,
        outlineColor: '#ffffff',
        outlineWidth: 2
      }
    })

    // 生成演示点位数据
    const pointsData = generateDemoPoints(1000)
    await engine.addData('demo-points', pointsData, { dataType: 'point' })

    // 创建轨迹图层
    await engine.createLayer('demo-trajectories', {
      type: 'trajectory',
      style: {
        lineColor: '#00ff00',
        lineWidth: 3,
        showPath: true
      }
    })

    // 生成演示轨迹数据
    const trajectoryData = generateDemoTrajectories(10)
    await engine.addData('demo-trajectories', trajectoryData)

    // 更新统计信息
    updateBasicStats()

  } catch (error) {
    console.error('加载基础演示失败:', error)
  }
}

const clearDemo = async () => {
  try {
    const engine = renderEngine.value
    const allLayers = engine.getAllLayers()

    for (const layerName of Object.keys(allLayers)) {
      await engine.removeLayer(layerName)
    }

    basicStats.value = null
    layers.value = []

  } catch (error) {
    console.error('清空演示失败:', error)
  }
}

const updateBasicStats = () => {
  const engine = renderEngine.value
  if (engine) {
    const stats = engine.getStats()
    basicStats.value = {
      entityCount: stats.entityCount || 0,
      fps: Math.round(stats.fps || 0),
      memoryUsage: Math.round(stats.memoryUsage || 0)
    }
  }
}

// 性能测试方法
const runPerformanceTest = async () => {
  try {
    performanceTestRunning.value = true
    performanceResults.value = null

    const engine = renderEngine.value
    const count = parseInt(performanceTestCount.value)

    // 设置性能预设
    engine.setPerformancePreset(performancePreset.value)

    // 记录开始时间
    const startTime = performance.now()

    // 创建测试图层
    await engine.createLayer('performance-test', {
      type: 'point',
      style: { color: '#0066ff', size: 6 }
    })

    // 生成大量测试数据
    const testData = generatePerformanceTestData(count)
    await engine.addData('performance-test', testData)

    // 等待渲染稳定
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 记录结果
    const endTime = performance.now()
    const stats = engine.getStats()

    performanceResults.value = {
      loadTime: Math.round(endTime - startTime),
      avgFps: Math.round(stats.fps || 0),
      peakMemory: Math.round(stats.memoryUsage || 0),
      renderCalls: stats.renderCalls || 0
    }

  } catch (error) {
    console.error('性能测试失败:', error)
  } finally {
    performanceTestRunning.value = false
  }
}

const stopPerformanceTest = async () => {
  try {
    const engine = renderEngine.value
    await engine.removeLayer('performance-test')
    performanceTestRunning.value = false

  } catch (error) {
    console.error('停止性能测试失败:', error)
  }
}

// 时间控制方法
const loadTimeDemo = async () => {
  try {
    const engine = renderEngine.value

    // 创建时间数据图层
    await engine.createLayer('time-demo', {
      type: 'trajectory',
      style: {
        lineColor: '#ff6600',
        lineWidth: 4,
        showPath: true,
        showPoints: true
      }
    })

    // 生成时间序列数据
    const timeData = generateTimeSeriesData()
    await engine.addData('time-demo', timeData)

    // 设置时间范围
    const start = new Date(timeRange.start)
    const end = new Date(timeRange.end)
    engine.setTimeRange(start, end)

    timeDataLoaded.value = true

  } catch (error) {
    console.error('加载时间演示失败:', error)
  }
}

const playTimeAnimation = () => {
  const engine = renderEngine.value
  engine.playTimeAnimation({
    speed: parseFloat(timeSpeed.value),
    loop: true
  })
  animationStatus.value = '播放中'
}

const pauseTimeAnimation = () => {
  const engine = renderEngine.value
  engine.pauseTimeAnimation()
  animationStatus.value = '暂停'
}

const stopTimeAnimation = () => {
  const engine = renderEngine.value
  engine.stopTimeAnimation()
  animationStatus.value = '停止'
}

// 图层管理方法
const createLayer = async () => {
  try {
    const engine = renderEngine.value
    await engine.createLayer(newLayerName.value, {
      type: newLayerType.value,
      style: getDefaultStyleForType(newLayerType.value)
    })

    newLayerName.value = ''

  } catch (error) {
    console.error('创建图层失败:', error)
  }
}

const loadLayerDemo = async () => {
  try {
    const engine = renderEngine.value

    // 创建多个演示图层
    const demoLayers = [
      { name: '城市点位', type: 'point', data: generateCityPoints() },
      { name: '交通路线', type: 'route', data: generateRoutes() },
      { name: '管理区域', type: 'area', data: generateAreas() }
    ]

    for (const layerConfig of demoLayers) {
      await engine.createLayer(layerConfig.name, {
        type: layerConfig.type,
        style: getDefaultStyleForType(layerConfig.type)
      })

      await engine.addData(layerConfig.name, layerConfig.data)
    }

  } catch (error) {
    console.error('加载图层演示失败:', error)
  }
}

const toggleLayerVisibility = (layerName) => {
  const engine = renderEngine.value
  const layer = layers.value.find(l => l.name === layerName)
  if (layer) {
    const newVisibility = !layer.visible
    engine.setLayerVisible(layerName, newVisibility)
    layer.visible = newVisibility
  }
}

const removeLayer = async (layerName) => {
  try {
    const engine = renderEngine.value
    await engine.removeLayer(layerName)

  } catch (error) {
    console.error('删除图层失败:', error)
  }
}

// 事件处理方法
const onLayerCreated = (layerName) => {
  const engine = renderEngine.value
  const layerInfo = engine.getLayer(layerName)

  // 检查layerInfo是否存在，避免null错误
  if (layerInfo) {
    layers.value.push({
      name: layerName,
      type: layerInfo.type || 'unknown',
      visible: true,
      entityCount: 0
    })
  } else {
    // 如果layerInfo为null，使用默认值
    layers.value.push({
      name: layerName,
      type: 'unknown',
      visible: true,
      entityCount: 0
    })
    console.warn(`图层信息获取失败: ${layerName}，使用默认配置`)
  }
}

const onLayerRemoved = (layerName) => {
  const index = layers.value.findIndex(l => l.name === layerName)
  if (index !== -1) {
    layers.value.splice(index, 1)
  }
}

const onDataUpdated = (layerName, count) => {
  const layer = layers.value.find(l => l.name === layerName)
  if (layer) {
    layer.entityCount = count
  }

  // 更新基础统计
  if (basicStats.value) {
    updateBasicStats()
  }
}

const onPerformanceWarning = (warning) => {
  lastWarning.value = `${warning.type}: ${warning.message}`
  setTimeout(() => {
    lastWarning.value = ''
  }, 5000)
}

const onTimeChanged = (time) => {
  currentTime.value = new Date(time).toLocaleString()
}

const onStatsUpdated = (stats) => {
  // 可以在这里处理统计信息更新
}

// 数据生成工具方法
const generateDemoPoints = (count) => {
  const points = []
  const centerLon = 116.404
  const centerLat = 39.915

  for (let i = 0; i < count; i++) {
    const lon = centerLon + (Math.random() - 0.5) * 0.1
    const lat = centerLat + (Math.random() - 0.5) * 0.1
    const height = Math.random() * 1000

    points.push({
      id: `point_${i}`,
      type: 'point',
      position: [lon, lat, height],
      properties: {
        name: `点位 ${i + 1}`,
        category: Math.random() > 0.5 ? 'A' : 'B'
      }
    })
  }

  return points
}

const generateDemoTrajectories = (count) => {
  const trajectories = []

  for (let i = 0; i < count; i++) {
    const positions = []
    let lon = 116.404 + (Math.random() - 0.5) * 0.05
    let lat = 39.915 + (Math.random() - 0.5) * 0.05

    for (let j = 0; j < 20; j++) {
      lon += (Math.random() - 0.5) * 0.01
      lat += (Math.random() - 0.5) * 0.01

      positions.push({
        time: new Date(Date.now() + j * 60000).toISOString(),
        position: [lon, lat, Math.random() * 500]
      })
    }

    trajectories.push({
      id: `trajectory_${i}`,
      type: 'trajectory',
      positions,
      properties: {
        vehicleId: `V${i + 1}`,
        route: `Route_${String.fromCharCode(65 + i)}`
      }
    })
  }

  return trajectories
}

const generatePerformanceTestData = (count) => {
  return generateDemoPoints(count)
}

const generateTimeSeriesData = () => {
  return generateDemoTrajectories(5)
}

const generateCityPoints = () => {
  const cities = [
    { name: '北京', position: [116.404, 39.915, 0] },
    { name: '上海', position: [121.473, 31.230, 0] },
    { name: '广州', position: [113.264, 23.129, 0] },
    { name: '深圳', position: [114.057, 22.543, 0] },
    { name: '杭州', position: [120.153, 30.287, 0] }
  ]

  return cities.map((city, index) => ({
    id: `city_${index}`,
    type: 'point',
    position: city.position,
    properties: {
      name: city.name,
      type: 'city'
    }
  }))
}

const generateRoutes = () => {
  return [
    {
      id: 'route_1',
      type: 'route',
      waypoints: [
        { position: [116.404, 39.915, 0], name: '北京' },
        { position: [118.804, 32.057, 0], name: '南京' },
        { position: [121.473, 31.230, 0], name: '上海' }
      ],
      properties: {
        routeName: '京沪线',
        distance: 1318000
      }
    }
  ]
}

const generateAreas = () => {
  return [
    {
      id: 'area_1',
      type: 'area',
      polygon: [
        [116.354, 39.865],
        [116.454, 39.865],
        [116.454, 39.965],
        [116.354, 39.965],
        [116.354, 39.865]
      ],
      properties: {
        name: '北京中心区',
        level: 1
      }
    }
  ]
}

const getDefaultStyleForType = (type) => {
  const styles = {
    point: { color: '#ff0000', size: 8 },
    trajectory: { lineColor: '#00ff00', lineWidth: 3 },
    relation: { lineColor: '#0000ff', lineWidth: 2 },
    event: { color: '#ff6600', size: 12, animation: 'pulse' },
    area: { fillColor: '#ff000080', outlineColor: '#ff0000' },
    route: { lineColor: '#00ffff', lineWidth: 4 }
  }

  return styles[type] || styles.point
}
</script>

<style scoped>
.cesium-render-demo {
  /* display: flex; */
  flex-direction: column;
  overflow: auto;
  height: 100vh;
  background: #f5f5f5;
}

.demo-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.demo-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 300;
}

.demo-description {
  font-size: 1.1rem;
  opacity: 0.9;
  max-width: 800px;
  margin: 0 auto;
}

.features-section {
  padding: 2rem;
  background: white;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.demo-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  margin: 1rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.demo-tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.tab-button {
  flex: 1;
  padding: 1rem 2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #e9ecef;
}

.tab-button.active {
  background: white;
  border-bottom: 3px solid #667eea;
  color: #667eea;
  font-weight: 600;
}

.demo-content {
  flex: 1;
  padding: 2rem;
}

.demo-panel h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.demo-panel .demo-description {
  margin-bottom: 2rem;
  color: #666;
  line-height: 1.6;
}

.demo-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-button:hover {
  background: #f8f9fa;
}

.action-button.primary {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.action-button.primary:hover {
  background: #5a6fd8;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.demo-stats {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.performance-controls,
.time-controls,
.layer-controls {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.control-group select,
.control-group input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.performance-results {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
}

.performance-results h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.result-label {
  color: #666;
}

.result-value {
  font-weight: 600;
  color: #333;
}

.time-status {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.status-item {
  display: flex;
  gap: 0.5rem;
}

.status-label {
  color: #666;
}

.status-value {
  font-weight: 500;
  color: #333;
}

.layer-list {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
}

.layer-list h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.layer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layer-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.layer-name {
  font-weight: 600;
  color: #333;
}

.layer-type {
  color: #666;
  font-size: 0.9rem;
}

.layer-count {
  color: #999;
  font-size: 0.8rem;
}

.layer-controls {
  display: flex;
  gap: 0.5rem;
}

.control-button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.control-button:hover {
  background: #f8f9fa;
}

.control-button.active {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.control-button.danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.control-button.danger:hover {
  background: #c82333;
}

.render-container {
  height: 600px;
  margin: 1rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.status-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem 2rem;
  background: #343a40;
  color: white;
  font-size: 0.9rem;
}

.status-bar .status-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.status-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-indicator.就绪 {
  background: #28a745;
}

.status-indicator.初始化中 {
  background: #ffc107;
  color: #333;
}

.status-indicator.未初始化 {
  background: #6c757d;
}

.status-warning {
  color: #ffc107;
  font-weight: 500;
}

@media (max-width: 768px) {
  .demo-header {
    padding: 1rem;
  }

  .demo-header h1 {
    font-size: 2rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .demo-tabs {
    flex-direction: column;
  }

  .performance-controls,
  .time-controls,
  .layer-controls {
    flex-direction: column;
    gap: 1rem;
  }

  .status-bar {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
