<template>
  <div class="cesium-render-engine">
    <!-- Cesium 容器 -->
    <div ref="cesiumContainer" class="cesium-container"></div>

    <!-- 控制面板 -->
    <div v-if="showControls" class="control-panel">
      <!-- 图层控制 -->
      <div class="layer-controls">
        <h3>图层控制</h3>
        <div v-for="layer in layers" :key="layer.id" class="layer-item">
          <label>
            <input
              type="checkbox"
              :checked="layer.visible"
              @change="toggleLayer(layer.id, $event.target.checked)"
            >
            {{ layer.name }}
          </label>
          <span class="entity-count">({{ layer.entityCount }})</span>
        </div>
      </div>

      <!-- 时间控制 -->
      <div class="time-controls">
        <h3>时间控制</h3>
        <div class="time-range">
          <label>开始时间:</label>
          <input
            type="datetime-local"
            :value="formatDateTimeLocal(timeRange.start)"
            @change="updateTimeRange('start', $event.target.value)"
          >
        </div>
        <div class="time-range">
          <label>结束时间:</label>
          <input
            type="datetime-local"
            :value="formatDateTimeLocal(timeRange.end)"
            @change="updateTimeRange('end', $event.target.value)"
          >
        </div>
        <div class="time-playback">
          <button @click="play" :disabled="isPlaying">播放</button>
          <button @click="pause" :disabled="!isPlaying">暂停</button>
          <button @click="stop">停止</button>
        </div>
      </div>

      <!-- 性能监控 -->
      <div class="performance-monitor">
        <h3>性能监控</h3>
        <div class="stats">
          <div>FPS: {{ stats.fps }}</div>
          <div>实体总数: {{ stats.totalEntities }}</div>
          <div>可见实体: {{ stats.visibleEntities }}</div>
          <div>内存使用: {{ formatMemory(stats.memoryUsage) }}</div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>
  </div>
</template>

<script>
import * as Cesium from 'cesium'
import RenderEngine from './RenderEngine.js'

export default {
  name: 'CesiumRenderEngine',
  props: {
    // 基础配置
    terrain: {
      type: String,
      default: 'https://assets.agi.com/stk-terrain/world'
    },
    imagery: {
      type: String,
      default: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
    },

    // 渲染引擎配置
    engineOptions: {
      type: Object,
      default: () => ({})
    },

    // 控制面板
    showControls: {
      type: Boolean,
      default: true
    },

    // 初始相机位置
    initialCamera: {
      type: Object,
      default: () => ({
        longitude: 116.3974,
        latitude: 39.9093,
        height: 1000000
      })
    },

    // 初始时间范围
    initialTimeRange: {
      type: Object,
      default: () => {
        const now = new Date()
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24小时前
        return {
          start: start.toISOString(),
          end: now.toISOString()
        }
      }
    }
  },

  data() {
    return {
      // Cesium 实例
      viewer: null,
      renderEngine: null,

      // 状态
      loading: true,
      loadingText: '初始化渲染引擎...',
      isPlaying: false,

      // 图层数据
      layers: [],

      // 时间数据
      timeRange: {
        start: new Date(),
        end: new Date()
      },
      currentTime: new Date(),

      // 统计数据
      stats: {
        fps: 0,
        totalEntities: 0,
        visibleEntities: 0,
        memoryUsage: 0
      },

      // 更新定时器
      statsUpdateTimer: null
    }
  },

  mounted() {
    this.initializeCesium()
  },

  beforeUnmount() {
    this.cleanup()
  },

  methods: {
    /**
     * 初始化 Cesium
     */
    async initializeCesium() {
      try {
        this.loadingText = '初始化 Cesium...'

        // 创建 Cesium Viewer
        this.viewer = new Cesium.Viewer(this.$refs.cesiumContainer, {
          // terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          // imageryProvider: false, // 禁用影像提供者
          timeline: false,
          animation: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          geocoder: false,
          infoBox: false,
          selectionIndicator: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity
        })

        // 设置初始相机位置
        this.viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            this.initialCamera.longitude,
            this.initialCamera.latitude,
            this.initialCamera.height
          )
        })

        // 初始化渲染引擎
        await this.initializeRenderEngine()

        // 设置初始时间范围
        this.setInitialTimeRange()

        // 启动统计更新
        this.startStatsUpdate()

        this.loading = false
        this.$emit('initialized', { viewer: this.viewer, renderEngine: this.renderEngine })
      } catch (error) {
        console.error('Failed to initialize Cesium:', error)
        console.error('Error details:', error.message, error.stack)
        this.loadingText = `初始化失败: ${error.message}`
        this.$emit('error', error)
      }
    },

    /**
     * 初始化渲染引擎
     */
    async initializeRenderEngine() {
      this.loadingText = '初始化渲染引擎...'

      this.renderEngine = new RenderEngine(this.viewer, {
        ...this.engineOptions
      })

      // 设置事件监听
      this.setupRenderEngineEvents()

      // 等待初始化完成
      await this.renderEngine.initialize()
    },

    /**
     * 设置渲染引擎事件监听
     */
    setupRenderEngineEvents() {
      // 图层事件
      this.renderEngine.on('layerCreated', ({ layerId, layer }) => {
        this.updateLayerList()
        this.$emit('layerCreated', { layerId, layer })
      })

      this.renderEngine.on('layerRemoved', ({ layerId }) => {
        this.updateLayerList()
        this.$emit('layerRemoved', { layerId })
      })

      this.renderEngine.on('dataAdded', ({ layerId, data }) => {
        this.updateLayerList()
        this.$emit('dataAdded', { layerId, data })
      })

      this.renderEngine.on('dataUpdated', ({ layerId, data }) => {
        this.updateLayerList()
        this.$emit('dataUpdated', { layerId, data })
      })

      // 时间事件
      this.renderEngine.on('timeRangeChanged', ({ timeRange }) => {
        this.timeRange = {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end)
        }
        this.$emit('timeRangeChanged', timeRange)
      })

      this.renderEngine.on('currentTimeChanged', ({ time }) => {
        this.currentTime = new Date(time)
        this.$emit('currentTimeChanged', time)
      })

      // 播放事件
      this.renderEngine.on('playStarted', () => {
        this.isPlaying = true
        this.$emit('playStarted')
      })

      this.renderEngine.on('playPaused', () => {
        this.isPlaying = false
        this.$emit('playPaused')
      })

      this.renderEngine.on('playStopped', () => {
        this.isPlaying = false
        this.$emit('playStopped')
      })
    },

    /**
     * 设置初始时间范围
     */
    setInitialTimeRange() {
      const timeRange = {
        start: new Date(this.initialTimeRange.start),
        end: new Date(this.initialTimeRange.end)
      }

      this.timeRange = timeRange
      this.renderEngine.setTimeRange(timeRange)
    },

    /**
     * 启动统计更新
     */
    startStatsUpdate() {
      this.statsUpdateTimer = setInterval(() => {
        if (this.renderEngine) {
          const stats = this.renderEngine.getStats()
          this.stats = {
            fps: stats.fps || 0,
            totalEntities: stats.totalEntities || 0,
            visibleEntities: stats.visibleEntities || 0,
            memoryUsage: stats.memoryUsage || 0
          }
        }
      }, 1000)
    },

    /**
     * 更新图层列表
     */
    updateLayerList() {
      if (!this.renderEngine) return

      const stats = this.renderEngine.getStats()
      this.layers = Array.from(stats.layerStats.entries()).map(([layerId, layerStats]) => {
        const layer = this.renderEngine.getLayer(layerId)
        return {
          id: layerId,
          name: layer?.name || layerId,
          visible: layer?.visible !== false,
          entityCount: layerStats.entityCount || 0
        }
      })
    },

    /**
     * 创建图层
     * @param {string} layerId - 图层ID
     * @param {Object} options - 图层选项
     * @returns {Object} 图层实例
     */
    createLayer(layerId, options = {}) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return this.renderEngine.createLayer(layerId, options)
    },

    /**
     * 获取图层
     * @param {string} layerId - 图层ID
     * @returns {Object|null} 图层实例
     */
    getLayer(layerId) {
      if (!this.renderEngine) return null
      return this.renderEngine.getLayer(layerId)
    },

    /**
     * 移除图层
     * @param {string} layerId - 图层ID
     */
    removeLayer(layerId) {
      if (!this.renderEngine) return
      this.renderEngine.removeLayer(layerId)
    },

    /**
     * 切换图层可见性
     * @param {string} layerId - 图层ID
     * @param {boolean} visible - 是否可见
     */
    toggleLayer(layerId, visible) {
      if (!this.renderEngine) return
      this.renderEngine.setLayerVisible(layerId, visible)
      this.updateLayerList()
    },

    /**
     * 添加数据到图层
     * @param {string} layerId - 图层ID
     * @param {Array} data - 数据数组
     * @param {Object} options - 选项
     */
    async addData(layerId, data, options = {}) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return await this.renderEngine.addData(layerId, data, options)
    },

    /**
     * 更新图层数据
     * @param {string} layerId - 图层ID
     * @param {Array} data - 数据数组
     * @param {Object} options - 选项
     */
    async updateData(layerId, data, options = {}) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return await this.renderEngine.updateData(layerId, data, options)
    },

    /**
     * 移除图层数据
     * @param {string} layerId - 图层ID
     * @param {Array} dataIds - 数据ID数组
     */
    async removeData(layerId, dataIds) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return await this.renderEngine.removeData(layerId, dataIds)
    },

    /**
     * 清空图层
     * @param {string} layerId - 图层ID
     */
    async clearLayer(layerId) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return await this.renderEngine.clearLayer(layerId)
    },

    /**
     * 更新时间范围
     * @param {string} type - 类型 ('start' | 'end')
     * @param {string} value - 时间值
     */
    updateTimeRange(type, value) {
      const date = new Date(value)
      if (isNaN(date.getTime())) return

      const newTimeRange = { ...this.timeRange }
      newTimeRange[type] = date

      // 验证时间范围
      if (newTimeRange.start >= newTimeRange.end) {
        console.warn('Invalid time range: start time must be before end time')
        return
      }

      this.timeRange = newTimeRange
      this.renderEngine.setTimeRange(newTimeRange)
    },

    /**
     * 播放时间动画
     */
    play() {
      if (!this.renderEngine) return
      this.renderEngine.play()
    },

    /**
     * 暂停时间动画
     */
    pause() {
      if (!this.renderEngine) return
      this.renderEngine.pause()
    },

    /**
     * 停止时间动画
     */
    stop() {
      if (!this.renderEngine) return
      this.renderEngine.stop()
    },

    /**
     * 设置当前时间
     * @param {Date} time - 时间
     */
    setCurrentTime(time) {
      if (!this.renderEngine) return
      this.renderEngine.setCurrentTime(time)
    },

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
      if (!this.renderEngine) return {}
      return this.renderEngine.getStats()
    },

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
      if (!this.renderEngine) return {}
      return this.renderEngine.getPerformanceReport()
    },

    /**
     * 导出配置
     * @returns {Object} 配置对象
     */
    exportConfig() {
      if (!this.renderEngine) return {}
      return this.renderEngine.exportConfig()
    },

    /**
     * 导入配置
     * @param {Object} config - 配置对象
     */
    async importConfig(config) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return await this.renderEngine.importConfig(config)
    },

    /**
     * 设置性能预设
     * @param {string} preset - 性能预设 ('high-performance' | 'balanced' | 'high-quality')
     */
    setPerformancePreset(preset) {
      if (!this.renderEngine) {
        throw new Error('Render engine not initialized')
      }

      return this.renderEngine.setPerformancePreset(preset)
    },

    /**
     * 获取当前性能预设
     * @returns {string|null} 当前性能预设名称
     */
    getCurrentPerformancePreset() {
      if (!this.renderEngine) return null
      return this.renderEngine.getCurrentPerformancePreset()
    },

    /**
     * 格式化日期时间为本地格式
     * @param {Date} date - 日期
     * @returns {string} 格式化的日期时间
     */
    formatDateTimeLocal(date) {
      if (!date) return ''
      const d = new Date(date)
      if (isNaN(d.getTime())) return ''

      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')

      return `${year}-${month}-${day}T${hours}:${minutes}`
    },

    /**
     * 格式化内存大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的内存大小
     */
    formatMemory(bytes) {
      if (!bytes) return '0 B'

      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unitIndex = 0

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }

      return `${size.toFixed(2)} ${units[unitIndex]}`
    },

    /**
     * 清理资源
     */
    cleanup() {
      // 停止统计更新
      if (this.statsUpdateTimer) {
        clearInterval(this.statsUpdateTimer)
        this.statsUpdateTimer = null
      }

      // 销毁渲染引擎
      if (this.renderEngine) {
        this.renderEngine.destroy()
        this.renderEngine = null
      }

      // 销毁 Cesium Viewer
      if (this.viewer) {
        this.viewer.destroy()
        this.viewer = null
      }
    }
  }
}
</script>

<style scoped>
.cesium-render-engine {
  position: relative;
  width: 100%;
  height: 100%;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  background: rgba(42, 42, 42, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: white;
  font-size: 12px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #48b6ff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.layer-controls {
  margin-bottom: 20px;
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.layer-item label {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.layer-item input[type="checkbox"] {
  margin-right: 8px;
}

.entity-count {
  color: #888;
  font-size: 11px;
}

.time-controls {
  margin-bottom: 20px;
}

.time-range {
  margin-bottom: 10px;
}

.time-range label {
  display: block;
  margin-bottom: 5px;
  color: #ccc;
}

.time-range input {
  width: 100%;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 11px;
}

.time-playback {
  display: flex;
  gap: 5px;
}

.time-playback button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: #48b6ff;
  color: white;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.2s;
}

.time-playback button:hover:not(:disabled) {
  background: #369bd7;
}

.time-playback button:disabled {
  background: #666;
  cursor: not-allowed;
}

.performance-monitor {
  margin-bottom: 20px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
}

.stats > div {
  padding: 5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 11px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #48b6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    width: calc(100% - 20px);
    top: auto;
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-height: 40vh;
  }
}
</style>
