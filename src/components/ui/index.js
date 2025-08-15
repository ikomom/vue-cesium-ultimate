// UI组件统一导出
import MouseTooltip from './MouseTooltip.vue'
import AdaptiveContainer from './AdaptiveContainer.vue'
import ContentDisplay from './ContentDisplay.vue'
import ContextMenu from './ContextMenu.vue'

export { MouseTooltip, AdaptiveContainer, ContentDisplay, ContextMenu }

export default {
  MouseTooltip,
  AdaptiveContainer,
  ContentDisplay,
  ContextMenu,
}

// 组件安装函数，用于全局注册
export function install(app) {
  app.component('MouseTooltip', MouseTooltip)
  app.component('AdaptiveContainer', AdaptiveContainer)
  app.component('ContentDisplay', ContentDisplay)
  app.component('ContextMenu', ContextMenu)
}
