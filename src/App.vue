<script setup>
import { useGlobalMapStore } from '@/stores/globalMap.js'
import { onMounted } from 'vue'

const globalMapStore = useGlobalMapStore()

onMounted(() => {
  globalMapStore.init()
})
</script>

<template>
  <div class="app-container" v-loading="globalMapStore.loading">
    <router-view  />
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
