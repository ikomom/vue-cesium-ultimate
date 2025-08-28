<template>
  <div class="render-engine-example">
    <!-- 渲染引擎组件 -->
    <CesiumRenderEngine
      ref="renderEngine"
      :show-controls="true"
      :initial-camera="initialCamera"
      :initial-time-range="initialTimeRange"
      :engine-options="engineOptions"
      @initialized="onEngineInitialized"
      @layerCreated="onLayerCreated"
      @dataAdded="onDataAdded"
      @timeRangeChanged="onTimeRangeChanged"
      @error="onError"
    />
    
    <!-- 操作面板 -->
    <div class="operation-panel">
      <div class="panel-section">
        <h3>数据操作</h3>
        <div class="button-group">
          <button @click="loadPointData" :disabled="loading">加载点位数据</button>
          <button @click="loadTrajectoryData" :disabled="loading">加载轨迹数据</button>
          <button @click="loadEventData" :disabled="loading">加载事件数据</button>
          <button @click="loadAreaData" :disabled="loading">加载区域数据</button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>动态数据</h3>
        <div class="button-group">
          <button @click="startRealTimeData" :disabled="realTimeRunning">开始实时数据</button>
          <button @click="stopRealTimeData" :disabled="!realTimeRunning">停止实时数据</button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>图层管理</h3>
        <div class="button-group">
          <button @click="createTestLayer">创建测试图层</button>
          <button @click="removeTestLayer">移除测试图层</button>
          <button @click="clearAllLayers">清空所有图层</button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>性能测试</h3>
        <div class="input-group">
          <label>实体数量:</label>
          <input v-model.number="performanceTestCount" type="number" min="100" max="100000" step="100">
          <button @click="performanceTest" :disabled="loading">性能测试</button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>状态信息</h3>
        <div class="status-info">
          <div>引擎状态: {{ engineStatus }}</div>
          <div>图层数量: {{ layerCount }}</div>
          <div>实体总数: {{ entityCount }}</div>
          <div v-if="lastError" class="error">错误: {{ lastError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CesiumRenderEngine from '../CesiumRenderEngine.vue'

export default {
  name: 'RenderEngineExample',
  components: {
    CesiumRenderEngine
  },
  
  data() {
    return {
      // 引擎状态
      engineStatus: '未初始化',
      loading: false,
      lastError: null,
      
      // 图层统计
      layerCount: 0,
      entityCount: 0,
      
      // 实时数据
      realTimeRunning: false,
      realTimeTimer: null,
      
      // 性能测试
      performanceTestCount: 1000,
      
      // 初始配置
      initialCamera: {
        longitude: 116.3974,
        latitude: 39.9093,
        height: 500000
      },
      
      initialTimeRange: {
        start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
        end: new Date().toISOString()
      },
      
      engineOptions: {
        enableLOD: true,
        enableFrustumCulling: true,
        enableBatching: true,
        enableInstancing: true,
        maxEntitiesPerLayer: 10000,
        updateInterval: 16 // 60 FPS
      }
    }
  },
  
  beforeUnmount() {
    this.cleanup()
  },
  
  methods: {
    /**
     * 引擎初始化完成
     */
    onEngineInitialized({ viewer, renderEngine }) {
      console.log('Render engine initialized:', { viewer, renderEngine })
      this.engineStatus = '已初始化'
      this.updateStats()
    },
    
    /**
     * 图层创建事件
     */
    onLayerCreated({ layerId, layer }) {
      console.log('Layer created:', { layerId, layer })
      this.updateStats()
    },
    
    /**
     * 数据添加事件
     */
    onDataAdded({ layerId, data }) {
      console.log('Data added:', { layerId, dataCount: data.length })
      this.updateStats()
    },
    
    /**
     * 时间范围变化事件
     */
    onTimeRangeChanged(timeRange) {
      console.log('Time range changed:', timeRange)
    },
    
    /**
     * 错误事件
     */
    onError(error) {
      console.error('Render engine error:', error)
      this.lastError = error.message || '未知错误'
      this.engineStatus = '错误'
    },
    
    /**
     * 更新统计信息
     */
    updateStats() {
      if (!this.$refs.renderEngine) return
      
      const stats = this.$refs.renderEngine.getStats()
      this.layerCount = stats.layerStats?.size || 0
      this.entityCount = stats.totalEntities || 0
    },
    
    /**
     * 加载点位数据
     */
    async loadPointData() {
      this.loading = true
      try {
        // 创建点位图层
        const layer = this.$refs.renderEngine.createLayer('points', {
          name: '测试点位',
          type: 'point'
        })
        
        // 生成测试点位数据
        const pointData = this.generatePointData(100)
        
        // 添加数据到图层
        await this.$refs.renderEngine.addData('points', pointData)
        
        console.log('Point data loaded:', pointData.length)
      } catch (error) {
        console.error('Failed to load point data:', error)
        this.lastError = error.message
      } finally {
        this.loading = false
        this.updateStats()
      }
    },
    
    /**
     * 加载轨迹数据
     */
    async loadTrajectoryData() {
      this.loading = true
      try {
        // 创建轨迹图层
        const layer = this.$refs.renderEngine.createLayer('trajectories', {
          name: '测试轨迹',
          type: 'trajectory'
        })
        
        // 生成测试轨迹数据
        const trajectoryData = this.generateTrajectoryData(10)
        
        // 添加数据到图层
        await this.$refs.renderEngine.addData('trajectories', trajectoryData)
        
        console.log('Trajectory data loaded:', trajectoryData.length)
      } catch (error) {
        console.error('Failed to load trajectory data:', error)
        this.lastError = error.message
      } finally {
        this.loading = false
        this.updateStats()
      }
    },
    
    /**
     * 加载事件数据
     */
    async loadEventData() {
      this.loading = true
      try {
        // 创建事件图层
        const layer = this.$refs.renderEngine.createLayer('events', {
          name: '测试事件',
          type: 'event'
        })
        
        // 生成测试事件数据
        const eventData = this.generateEventData(50)
        
        // 添加数据到图层
        await this.$refs.renderEngine.addData('events', eventData)
        
        console.log('Event data loaded:', eventData.length)
      } catch (error) {
        console.error('Failed to load event data:', error)
        this.lastError = error.message
      } finally {
        this.loading = false
        this.updateStats()
      }
    },
    
    /**
     * 加载区域数据
     */
    async loadAreaData() {
      this.loading = true
      try {
        // 创建区域图层
        const layer = this.$refs.renderEngine.createLayer('areas', {
          name: '测试区域',
          type: 'area'
        })
        
        // 生成测试区域数据
        const areaData = this.generateAreaData(20)
        
        // 添加数据到图层
        await this.$refs.renderEngine.addData('areas', areaData)
        
        console.log('Area data loaded:', areaData.length)
      } catch (error) {
        console.error('Failed to load area data:', error)
        this.lastError = error.message
      } finally {
        this.loading = false
        this.updateStats()
      }
    },
    
    /**
     * 开始实时数据
     */
    startRealTimeData() {
      if (this.realTimeRunning) return
      
      this.realTimeRunning = true
      
      // 创建实时数据图层
      this.$refs.renderEngine.createLayer('realtime', {
        name: '实时数据',
        type: 'point'
      })
      
      // 定时添加新数据
      this.realTimeTimer = setInterval(() => {
        const newData = this.generatePointData(5, true)
        this.$refs.renderEngine.addData('realtime', newData)
        this.updateStats()
      }, 1000)
      
      console.log('Real-time data started')
    },
    
    /**
     * 停止实时数据
     */
    stopRealTimeData() {
      if (!this.realTimeRunning) return
      
      this.realTimeRunning = false
      
      if (this.realTimeTimer) {
        clearInterval(this.realTimeTimer)
        this.realTimeTimer = null
      }
      
      console.log('Real-time data stopped')
    },
    
    /**
     * 创建测试图层
     */
    createTestLayer() {
      const layerId = `test_layer_${Date.now()}`
      const layer = this.$refs.renderEngine.createLayer(layerId, {
        name: `测试图层 ${new Date().toLocaleTimeString()}`,
        type: 'point'
      })
      
      console.log('Test layer created:', layerId)
      this.updateStats()
    },
    
    /**
     * 移除测试图层
     */
    removeTestLayer() {
      const stats = this.$refs.renderEngine.getStats()
      const layerIds = Array.from(stats.layerStats.keys())
      const testLayers = layerIds.filter(id => id.startsWith('test_layer_'))
      
      if (testLayers.length > 0) {
        const layerId = testLayers[testLayers.length - 1]
        this.$refs.renderEngine.removeLayer(layerId)
        console.log('Test layer removed:', layerId)
        this.updateStats()
      }
    },
    
    /**
     * 清空所有图层
     */
    async clearAllLayers() {
      const stats = this.$refs.renderEngine.getStats()
      const layerIds = Array.from(stats.layerStats.keys())
      
      for (const layerId of layerIds) {
        await this.$refs.renderEngine.clearLayer(layerId)
      }
      
      console.log('All layers cleared')
      this.updateStats()
    },
    
    /**
     * 性能测试
     */
    async performanceTest() {
      this.loading = true
      const startTime = performance.now()
      
      try {
        // 创建性能测试图层
        const layer = this.$refs.renderEngine.createLayer('performance_test', {
          name: `性能测试 (${this.performanceTestCount} 实体)`,
          type: 'point'
        })
        
        // 生成大量测试数据
        const testData = this.generatePointData(this.performanceTestCount)
        
        // 添加数据到图层
        await this.$refs.renderEngine.addData('performance_test', testData)
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        console.log(`Performance test completed: ${this.performanceTestCount} entities in ${duration.toFixed(2)}ms`)
        
        // 获取性能报告
        const report = this.$refs.renderEngine.getPerformanceReport()
        console.log('Performance report:', report)
        
      } catch (error) {
        console.error('Performance test failed:', error)
        this.lastError = error.message
      } finally {
        this.loading = false
        this.updateStats()
      }
    },
    
    /**
     * 生成点位数据
     */
    generatePointData(count, withTime = false) {
      const data = []
      const baseTime = Date.now()
      
      for (let i = 0; i < count; i++) {
        const longitude = 116.3974 + (Math.random() - 0.5) * 0.1
        const latitude = 39.9093 + (Math.random() - 0.5) * 0.1
        const height = Math.random() * 1000
        
        const point = {
          id: `point_${Date.now()}_${i}`,
          type: 'point',
          position: {
            longitude,
            latitude,
            height
          },
          properties: {
            name: `点位 ${i + 1}`,
            category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
            value: Math.random() * 100
          },
          style: {
            color: this.getRandomColor(),
            scale: 0.5 + Math.random() * 1.5,
            icon: 'circle'
          }
        }
        
        if (withTime) {
          point.time = {
            start: new Date(baseTime + i * 1000).toISOString(),
            end: new Date(baseTime + (i + 60) * 1000).toISOString()
          }
        }
        
        data.push(point)
      }
      
      return data
    },
    
    /**
     * 生成轨迹数据
     */
    generateTrajectoryData(count) {
      const data = []
      const baseTime = Date.now() - 2 * 60 * 60 * 1000 // 2小时前
      
      for (let i = 0; i < count; i++) {
        const startLon = 116.3974 + (Math.random() - 0.5) * 0.05
        const startLat = 39.9093 + (Math.random() - 0.5) * 0.05
        
        const points = []
        const pointCount = 20 + Math.floor(Math.random() * 30)
        
        for (let j = 0; j < pointCount; j++) {
          const longitude = startLon + (Math.random() - 0.5) * 0.02
          const latitude = startLat + (Math.random() - 0.5) * 0.02
          const height = Math.random() * 500
          const time = new Date(baseTime + j * 60000).toISOString() // 每分钟一个点
          
          points.push({
            longitude,
            latitude,
            height,
            time,
            properties: {
              speed: 20 + Math.random() * 80,
              direction: Math.random() * 360
            }
          })
        }
        
        const trajectory = {
          id: `trajectory_${Date.now()}_${i}`,
          type: 'trajectory',
          points,
          properties: {
            name: `轨迹 ${i + 1}`,
            vehicle: `车辆${i + 1}`,
            totalDistance: Math.random() * 50000
          },
          style: {
            lineColor: this.getRandomColor(),
            lineWidth: 2 + Math.random() * 3,
            showPath: true,
            showPoints: true
          }
        }
        
        data.push(trajectory)
      }
      
      return data
    },
    
    /**
     * 生成事件数据
     */
    generateEventData(count) {
      const data = []
      const eventTypes = ['warning', 'error', 'info', 'success']
      const baseTime = Date.now() - 60 * 60 * 1000 // 1小时前
      
      for (let i = 0; i < count; i++) {
        const longitude = 116.3974 + (Math.random() - 0.5) * 0.08
        const latitude = 39.9093 + (Math.random() - 0.5) * 0.08
        const height = Math.random() * 200
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        
        const event = {
          id: `event_${Date.now()}_${i}`,
          type: 'event',
          position: {
            longitude,
            latitude,
            height
          },
          properties: {
            name: `事件 ${i + 1}`,
            eventType,
            level: Math.floor(Math.random() * 5) + 1,
            description: `这是一个${eventType}类型的事件`,
            source: 'system'
          },
          time: {
            start: new Date(baseTime + i * 60000).toISOString(),
            duration: 300000 // 5分钟
          },
          style: {
            icon: eventType,
            color: this.getEventColor(eventType),
            scale: 1 + Math.random(),
            showLabel: true
          }
        }
        
        data.push(event)
      }
      
      return data
    },
    
    /**
     * 生成区域数据
     */
    generateAreaData(count) {
      const data = []
      
      for (let i = 0; i < count; i++) {
        const centerLon = 116.3974 + (Math.random() - 0.5) * 0.06
        const centerLat = 39.9093 + (Math.random() - 0.5) * 0.06
        const radius = 0.005 + Math.random() * 0.01
        
        // 生成多边形顶点
        const vertices = []
        const vertexCount = 6 + Math.floor(Math.random() * 6)
        
        for (let j = 0; j < vertexCount; j++) {
          const angle = (j / vertexCount) * 2 * Math.PI
          const r = radius * (0.8 + Math.random() * 0.4)
          const longitude = centerLon + r * Math.cos(angle)
          const latitude = centerLat + r * Math.sin(angle)
          vertices.push({ longitude, latitude })
        }
        
        const area = {
          id: `area_${Date.now()}_${i}`,
          type: 'area',
          vertices,
          properties: {
            name: `区域 ${i + 1}`,
            category: ['residential', 'commercial', 'industrial'][Math.floor(Math.random() * 3)],
            population: Math.floor(Math.random() * 100000),
            area: Math.random() * 10
          },
          style: {
            fillColor: this.getRandomColor(0.3),
            outlineColor: this.getRandomColor(),
            outlineWidth: 2,
            showLabel: true
          }
        }
        
        data.push(area)
      }
      
      return data
    },
    
    /**
     * 获取随机颜色
     */
    getRandomColor(alpha = 1) {
      const r = Math.floor(Math.random() * 256)
      const g = Math.floor(Math.random() * 256)
      const b = Math.floor(Math.random() * 256)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    },
    
    /**
     * 获取事件颜色
     */
    getEventColor(eventType) {
      const colors = {
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        success: '#4caf50'
      }
      return colors[eventType] || '#666666'
    },
    
    /**
     * 清理资源
     */
    cleanup() {
      this.stopRealTimeData()
    }
  }
}
</script>

<style scoped>
.render-engine-example {
  position: relative;
  width: 100%;
  height: 100vh;
}

.operation-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 280px;
  background: rgba(42, 42, 42, 0.95);
  border-radius: 8px;
  padding: 15px;
  color: white;
  font-size: 12px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

.panel-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.panel-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #48b6ff;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.button-group button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: #48b6ff;
  color: white;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.2s;
}

.button-group button:hover:not(:disabled) {
  background: #369bd7;
}

.button-group button:disabled {
  background: #666;
  cursor: not-allowed;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  color: #ccc;
  font-size: 11px;
}

.input-group input {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 11px;
}

.input-group button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: #48b6ff;
  color: white;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.2s;
}

.input-group button:hover:not(:disabled) {
  background: #369bd7;
}

.input-group button:disabled {
  background: #666;
  cursor: not-allowed;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.status-info > div {
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 11px;
}

.status-info .error {
  background: rgba(244, 67, 54, 0.2);
  color: #ff6b6b;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .operation-panel {
    width: calc(100% - 20px);
    top: auto;
    bottom: 10px;
    left: 10px;
    right: 10px;
    max-height: 50vh;
  }
}
</style>