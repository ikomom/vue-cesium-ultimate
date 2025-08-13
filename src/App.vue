<script setup>
import CesiumView from './containers/CesiumView.vue'
import { useGlobalMapStore } from '@/stores/globalMap.js'
import { onMounted } from 'vue'

const globalMapStore = useGlobalMapStore()

onMounted(() => {
  globalMapStore.init()
})
</script>

<template>
  <CesiumView v-loading="globalMapStore.loading" />
</template>

<style lang="less">
/* 全局样式 */
</style>
