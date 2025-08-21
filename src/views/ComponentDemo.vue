<template>
  <div class="component-demo">
    <div class="demo-header">
      <h1>UI组件演示</h1>
      <p>展示鼠标提示、自适应容器、内容展示和右键菜单组件的使用</p>
    </div>

    <div class="demo-sections">
      <!-- 鼠标提示组件演示 -->
      <section class="demo-section">
        <h2>鼠标提示组件 (MouseTooltip)</h2>
        <div class="tooltip-demo">
          <div
            class="tooltip-trigger"
            @mouseenter="showTooltip($event, 'basic')"
            @mouseleave="hideTooltip('basic')"
          >
            悬停显示基础提示
          </div>

          <div
            class="tooltip-trigger custom"
            @mouseenter="showTooltip($event, 'custom')"
            @mouseleave="hideTooltip('custom')"
          >
            悬停显示自定义提示
          </div>

          <MouseTooltip
            :visible="tooltips.basic.visible"
            :position="tooltips.basic.position"
            content="这是一个基础的鼠标提示"
          />

          <MouseTooltip
            :visible="tooltips.custom.visible"
            :position="tooltips.custom.position"
            :max-width="300"
            theme="dark"
          >
            <div class="custom-tooltip-content">
              <h4>自定义提示内容</h4>
              <p>支持HTML内容和自定义样式</p>
              <div class="tooltip-stats">
                <span>状态: 正常</span>
                <span>数量: 42</span>
              </div>
            </div>
          </MouseTooltip>
        </div>
      </section>

      <!-- 内容展示组件演示 -->
      <section class="demo-section">
        <h2>内容展示组件 (ContentDisplay)</h2>

        <div class="content-demo">
          <h3>基础数据展示</h3>
          <ContentDisplay
            :data="basicData"
            :format="basicFormat"
            :columns="2"
            class="demo-content"
          />

          <h3>高级格式化展示</h3>
          <ContentDisplay
            :data="advancedData"
            :format="advancedFormat"
            :columns="3"
            class="demo-content"
          >
            <!-- 自定义插槽 -->
            <template #status="{ item }">
              <div class="status-item">
                <span class="status-label">{{ item.label }}:</span>
                <span :class="`status-value status-${item.value}`">
                  {{ getStatusText(item.value) }}
                </span>
              </div>
            </template>
          </ContentDisplay>

          <h3>空数据展示</h3>
          <ContentDisplay
            :data="{}"
            empty-text="暂无相关数据"
            class="demo-content"
          >
            <template #empty>
              <div class="custom-empty">
                <i class="empty-icon">📭</i>
                <p>没有找到任何数据</p>
              </div>
            </template>
          </ContentDisplay>
        </div>
      </section>

      <!-- 自适应容器演示 -->
      <section class="demo-section">
        <h2>自适应容器组件 (AdaptiveContainer)</h2>

        <div class="container-demo">
          <div class="trigger-area">
            <button
              v-for="(pos, index) in containerPositions"
              :key="index"
              class="container-trigger"
              :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
              @click="toggleContainer(index, $event)"
            >
              {{ pos.label }}
            </button>
          </div>

          <AdaptiveContainer
            v-if="activeContainer !== null"
            :trigger-x="containerTrigger.x"
            :trigger-y="containerTrigger.y"
            :preferred-position="containerTrigger.position"
            :max-width="250"
            class="demo-adaptive-container"
          >
            <div class="container-content">
              <h4>自适应容器内容</h4>
              <p>这个容器会根据屏幕边界自动调整位置</p>
              <ContentDisplay
                :data="containerData"
                :format="containerFormat"
                :columns="1"
              />
              <button @click="closeContainer" class="close-btn">关闭</button>
            </div>
          </AdaptiveContainer>
        </div>
      </section>

      <!-- 右键菜单演示 -->
      <section class="demo-section">
        <h2>右键菜单组件 (ContextMenu)</h2>

        <div class="context-menu-demo">
          <div
            class="context-area"
            @contextmenu.prevent="showContextMenu($event)"
          >
            <p>在此区域右键点击显示菜单</p>
            <div class="context-items">
              <div class="context-item" @contextmenu.prevent="showItemMenu($event, 'item1')">
                项目 1 (右键查看选项)
              </div>
              <div class="context-item" @contextmenu.prevent="showItemMenu($event, 'item2')">
                项目 2 (右键查看选项)
              </div>
            </div>
          </div>

          <ContextMenu
            :visible="contextMenu.visible"
            :position="contextMenu.position"
            :menu-items="contextMenu.items"
            @select="handleMenuSelect"
            @close="closeContextMenu"
          />
        </div>
      </section>

      <!-- 综合演示 -->
      <section class="demo-section">
        <h2>综合演示</h2>

        <div class="integrated-demo">
          <div class="demo-map">
            <div
              v-for="point in mapPoints"
              :key="point.id"
              class="map-point"
              :style="{ left: point.x + 'px', top: point.y + 'px' }"
              @mouseenter="showPointTooltip($event, point)"
              @mouseleave="hidePointTooltip"
              @contextmenu.prevent="showPointMenu($event, point)"
            >
              {{ point.name }}
            </div>
          </div>

          <!-- 点位提示 -->
          <MouseTooltip
            :visible="pointTooltip.visible"
            :position="pointTooltip.position"
            :max-width="300"
          >
            <ContentDisplay
              :data="pointTooltip.data"
              :format="pointTooltipFormat"
              :columns="2"
            />
          </MouseTooltip>

          <!-- 点位右键菜单 -->
          <ContextMenu
            :visible="pointMenu.visible"
            :position="pointMenu.position"
            :menu-items="pointMenu.items"
            @select="handlePointMenuSelect"
            @close="closePointMenu"
          />

          <!-- 详情弹窗 -->
          <AdaptiveContainer
            v-if="detailPopup.visible"
            :trigger-x="detailPopup.position.x"
            :trigger-y="detailPopup.position.y"
            :max-width="400"
            class="detail-popup"
          >
            <div class="popup-content">
              <div class="popup-header">
                <h3>{{ detailPopup.title }}</h3>
                <button @click="closeDetailPopup" class="close-btn">×</button>
              </div>
              <ContentDisplay
                :data="detailPopup.data"
                :format="detailPopupFormat"
                :columns="2"
              />
            </div>
          </AdaptiveContainer>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import MouseTooltip from '@/components/ui/MouseTooltip.vue'
import AdaptiveContainer from '@/components/ui/AdaptiveContainer.vue'
import ContentDisplay from '@/components/ui/ContentDisplay.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'

// 鼠标提示相关
const tooltips = reactive({
  basic: { visible: false, position: { x: 0, y: 0 } },
  custom: { visible: false, position: { x: 0, y: 0 } }
})

function showTooltip(event, type) {
  tooltips[type].position = { x: event.clientX, y: event.clientY }
  tooltips[type].visible = true
}

function hideTooltip(type) {
  tooltips[type].visible = false
}

// 内容展示相关
const basicData = {
  name: '测试项目',
  status: 'active',
  count: 1234,
  progress: 0.75,
  updateTime: new Date().toISOString()
}

const basicFormat = {
  count: { type: 'number', thousands: true },
  progress: { type: 'percent', precision: 1 },
  updateTime: { type: 'date', format: 'YYYY-MM-DD HH:mm' }
}

const advancedData = [
  { key: 'temperature', label: '温度', value: 25.6 },
  { key: 'humidity', label: '湿度', value: 0.68 },
  { key: 'pressure', label: '气压', value: 1013.25 },
  { key: 'status', label: '状态', value: 'normal' },
  { key: 'lastCheck', label: '最后检查', value: new Date().toISOString() }
]

const advancedFormat = {
  temperature: { suffix: '°C', precision: 1, class: 'highlight' },
  humidity: { type: 'percent', precision: 0 },
  pressure: { suffix: ' hPa', precision: 2 },
  lastCheck: { type: 'date', format: 'MM-DD HH:mm' }
}

function getStatusText(status) {
  const statusMap = {
    normal: '正常',
    warning: '警告',
    error: '错误'
  }
  return statusMap[status] || status
}

// 自适应容器相关
const activeContainer = ref(null)
const containerTrigger = ref({ x: 0, y: 0, position: 'bottom-right' })

const containerPositions = [
  { x: 50, y: 50, label: '左上', position: 'bottom-right' },
  { x: 300, y: 50, label: '右上', position: 'bottom-left' },
  { x: 50, y: 200, label: '左下', position: 'top-right' },
  { x: 300, y: 200, label: '右下', position: 'top-left' }
]

const containerData = {
  title: '容器内容',
  description: '这是自适应容器中的内容',
  timestamp: new Date().toISOString()
}

const containerFormat = {
  timestamp: { type: 'date', format: 'YYYY-MM-DD HH:mm:ss' }
}

function toggleContainer(index, event) {
  if (activeContainer.value === index) {
    closeContainer()
  } else {
    const rect = event.target.getBoundingClientRect()
    containerTrigger.value = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      position: containerPositions[index].position
    }
    activeContainer.value = index
  }
}

function closeContainer() {
  activeContainer.value = null
}

// 右键菜单相关
const contextMenu = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  items: [
    { label: '新建', icon: 'icon-plus', callback: () => console.log('新建') },
    { label: '编辑', icon: 'icon-edit', callback: () => console.log('编辑') },
    { type: 'divider' },
    { label: '复制', icon: 'icon-copy', shortcut: 'Ctrl+C' },
    { label: '粘贴', icon: 'icon-paste', shortcut: 'Ctrl+V' },
    { type: 'divider' },
    { label: '删除', icon: 'icon-delete', danger: true, callback: () => console.log('删除') }
  ]
})

function showContextMenu(event) {
  contextMenu.position = { x: event.clientX, y: event.clientY }
  contextMenu.visible = true
}

function closeContextMenu() {
  contextMenu.visible = false
}

function handleMenuSelect(item) {
  console.log('选择菜单项:', item)
}

function showItemMenu(event, itemId) {
  contextMenu.items = [
    { label: `查看 ${itemId}`, callback: () => console.log(`查看 ${itemId}`) },
    { label: `编辑 ${itemId}`, callback: () => console.log(`编辑 ${itemId}`) },
    { type: 'divider' },
    { label: '属性', callback: () => console.log('属性') }
  ]
  showContextMenu(event)
}

// 综合演示相关
const mapPoints = [
  { id: 1, name: 'A', x: 100, y: 80, type: 'station', status: 'online', data: { temperature: 22.5, humidity: 0.65 } },
  { id: 2, name: 'B', x: 250, y: 120, type: 'sensor', status: 'offline', data: { temperature: 18.3, humidity: 0.72 } },
  { id: 3, name: 'C', x: 180, y: 200, type: 'station', status: 'warning', data: { temperature: 35.1, humidity: 0.45 } }
]

const pointTooltip = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  data: {}
})

const pointTooltipFormat = {
  temperature: { suffix: '°C', precision: 1 },
  humidity: { type: 'percent', precision: 0 }
}

const pointMenu = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  items: [],
  currentPoint: null
})

const detailPopup = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  title: '',
  data: {}
})

const detailPopupFormat = {
  type: { label: '类型' },
  status: { label: '状态' },
  temperature: { label: '温度', suffix: '°C', precision: 1 },
  humidity: { label: '湿度', type: 'percent', precision: 0 },
  lastUpdate: { label: '最后更新', type: 'date', format: 'YYYY-MM-DD HH:mm:ss' }
}

function showPointTooltip(event, point) {
  pointTooltip.position = { x: event.clientX, y: event.clientY }
  pointTooltip.data = {
    name: point.name,
    type: point.type,
    status: point.status,
    ...point.data
  }
  pointTooltip.visible = true
}

function hidePointTooltip() {
  pointTooltip.visible = false
}

function showPointMenu(event, point) {
  pointMenu.position = { x: event.clientX, y: event.clientY }
  pointMenu.currentPoint = point
  pointMenu.items = [
    { label: '查看详情', callback: () => showPointDetail(point) },
    { label: '编辑属性', callback: () => console.log('编辑', point.name) },
    { type: 'divider' },
    { label: '刷新数据', callback: () => console.log('刷新', point.name) },
    { label: '导出数据', callback: () => console.log('导出', point.name) },
    { type: 'divider' },
    { label: '删除', danger: true, callback: () => console.log('删除', point.name) }
  ]
  pointMenu.visible = true
}

function closePointMenu() {
  pointMenu.visible = false
}

function handlePointMenuSelect(item) {
  console.log('选择点位菜单:', item)
}

function showPointDetail(point) {
  detailPopup.position = pointMenu.position
  detailPopup.title = `点位详情 - ${point.name}`
  detailPopup.data = {
    name: point.name,
    type: point.type,
    status: point.status,
    ...point.data,
    lastUpdate: new Date().toISOString()
  }
  detailPopup.visible = true
  closePointMenu()
}

function closeDetailPopup() {
  detailPopup.visible = false
}
</script>

<style scoped>
.component-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  overflow: auto;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
}

.demo-header h1 {
  color: #333;
  margin-bottom: 8px;
}

.demo-header p {
  color: #666;
  font-size: 14px;
}

.demo-sections {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.demo-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 24px;
  background: #fff;
}

.demo-section h2 {
  color: #333;
  margin-bottom: 16px;
  font-size: 18px;
}

.demo-section h3 {
  color: #555;
  margin: 20px 0 12px 0;
  font-size: 14px;
}

/* 鼠标提示演示 */
.tooltip-demo {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.tooltip-trigger {
  padding: 12px 20px;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tooltip-trigger:hover {
  background: #e0e0e0;
}

.tooltip-trigger.custom {
  background: #1890ff;
  color: white;
}

.tooltip-trigger.custom:hover {
  background: #40a9ff;
}

.custom-tooltip-content h4 {
  margin: 0 0 8px 0;
  color: #fff;
}

.custom-tooltip-content p {
  margin: 0 0 12px 0;
  color: #ccc;
  font-size: 12px;
}

.tooltip-stats {
  display: flex;
  gap: 16px;
  font-size: 11px;
}

/* 内容展示演示 */
.content-demo .demo-content {
  background: #1890ff;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-value {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-normal {
  background: #f6ffed;
  color: #52c41a;
}

.status-warning {
  background: #fffbe6;
  color: #faad14;
}

.status-error {
  background: #fff2f0;
  color: #ff4d4f;
}

.custom-empty {
  text-align: center;
  padding: 20px;
  color: #999;
}

.empty-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
}

/* 自适应容器演示 */
.container-demo {
  position: relative;
  height: 300px;
  background: #f5f5f5;
  border-radius: 6px;
}

.trigger-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.container-trigger {
  position: absolute;
  padding: 8px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.container-trigger:hover {
  background: #40a9ff;
}

.demo-adaptive-container {
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.container-content {
  padding: 16px;
}

.container-content h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.container-content p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 12px;
}

.close-btn {
  padding: 4px 8px;
  background: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
}

.close-btn:hover {
  background: #e0e0e0;
}

/* 右键菜单演示 */
.context-menu-demo {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 20px;
}

.context-area {
  background: white;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  padding: 40px 20px;
  text-align: center;
  cursor: context-menu;
}

.context-area p {
  margin: 0 0 20px 0;
  color: #666;
}

.context-items {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.context-item {
  padding: 12px 16px;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: context-menu;
  transition: background-color 0.2s;
}

.context-item:hover {
  background: #e0e0e0;
}

/* 综合演示 */
.integrated-demo {
  position: relative;
  background: #f0f8ff;
  border-radius: 6px;
  padding: 20px;
}

.demo-map {
  position: relative;
  height: 300px;
  background: linear-gradient(45deg, #f0f8ff 25%, transparent 25%),
              linear-gradient(-45deg, #f0f8ff 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f0f8ff 75%),
              linear-gradient(-45deg, transparent 75%, #f0f8ff 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  border-radius: 6px;
}

.map-point {
  position: absolute;
  width: 40px;
  height: 40px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
  transform: translate(-50%, -50%);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.map-point:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.5);
}

.detail-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.popup-content {
  max-width: 400px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.popup-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.popup-header .close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 16px;
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .component-demo {
    padding: 16px;
  }

  .tooltip-demo {
    flex-direction: column;
  }

  .context-items {
    flex-direction: column;
    align-items: center;
  }

  .container-demo {
    height: 250px;
  }
}
</style>
