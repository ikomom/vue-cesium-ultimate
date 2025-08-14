<script setup>
import CesiumView from './containers/CesiumView.vue'
import LayerControlPanel from '@/components/business/LayerControlPanel.vue'
import { useGlobalMapStore } from '@/stores/globalMap.js'
import { onMounted } from 'vue'

const globalMapStore = useGlobalMapStore()

onMounted(() => {
  globalMapStore.init()
})
</script>

<template>
  <div class="app-container">
    <CesiumView v-loading="globalMapStore.loading" />
    <LayerControlPanel />
  </div>
</template>

<style lang="less">
/* 全局样式 */
.app-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 确保图层控制面板在最上层 */
.layer-control-panel {
  z-index: 1000;
}
</style>
