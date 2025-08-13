import { defineStore } from 'pinia'
import { getTargetBaseData, getTargetLocationData, getRelationData } from '@/api/index.js'
import { ref } from 'vue'

export const useGlobalMapStore = defineStore('globalMap', () => {
  // 目标基础数据
  const targetBaseData = ref([])
  // 目标位置数据
  const targetLocationData = ref([])
  // 关系数据
  const relationData = ref([])
  const loading = ref(false)

  function init() {
    loading.value = true
    // 初始化地图
    return Promise.all([getTargetBaseData(), getTargetLocationData(), getRelationData()])
      .then((res) => {
        targetBaseData.value = [...(res[0] || [])]
        targetLocationData.value = [...(res[1] || [])]
        relationData.value = [...(res[2] || [])]
      })
      .finally(() => {
        loading.value = false
      })
  }

  return {
    // 方法
    init,
    // 变量
    targetBaseData,
    targetLocationData,
    relationData,
    loading,
  }
})
