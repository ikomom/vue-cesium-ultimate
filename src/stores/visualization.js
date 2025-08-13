import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVisualizationStore = defineStore('visualization', () => {
  // 显示控制状态
  const showTargets = ref(true)
  const showRelationships = ref(true)
  
  // 材质控制状态
  const useMaterialProperty = ref(true) // MaterialProperty 使用开关
  const materialMode = ref('flyline') // 当前材质模式: 'flyline', 'pulse', 'solid'
  const materialSpeed = ref(2.0) // 材质动画速度
  const materialOpacity = ref(0.8) // 材质透明度
  
  // 材质颜色配置
  const materialColors = ref({
    flyline: { r: 0.0, g: 1.0, b: 1.0, a: 0.8 }, // 青色飞线
    pulse: { r: 1.0, g: 0.5, b: 0.0, a: 0.9 }, // 橙色脉冲
    dynamic: { r: 1.0, g: 0.6, b: 0.2, a: 0.8 }, // 橙色动态纹理
    solid: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } // 白色实线
  })

  // 切换目标点位显示
  const toggleTargets = () => {
    showTargets.value = !showTargets.value
  }

  // 切换关系连线显示
  const toggleRelationships = () => {
    showRelationships.value = !showRelationships.value
  }

  // 设置目标点位显示状态
  const setShowTargets = (value) => {
    showTargets.value = value
  }

  // 设置关系连线显示状态
  const setShowRelationships = (value) => {
    showRelationships.value = value
  }
  
  // 切换材质属性模式
  const toggleMaterialProperty = () => {
    useMaterialProperty.value = !useMaterialProperty.value
  }
  
  // 设置材质属性模式
  const setUseMaterialProperty = (value) => {
    useMaterialProperty.value = value
  }
  
  // 设置材质模式
  const setMaterialMode = (mode) => {
    if (['flyline', 'pulse', 'dynamic', 'solid'].includes(mode)) {
      materialMode.value = mode
    }
  }
  
  // 设置材质速度
  const setMaterialSpeed = (speed) => {
    if (speed >= 0.1 && speed <= 10.0) {
      materialSpeed.value = speed
    }
  }
  
  // 设置材质透明度
  const setMaterialOpacity = (opacity) => {
    if (opacity >= 0.0 && opacity <= 1.0) {
      materialOpacity.value = opacity
    }
  }
  
  // 设置材质颜色
  const setMaterialColor = (type, color) => {
    if (materialColors.value[type] && color) {
      materialColors.value[type] = { ...color }
    }
  }
  
  // 获取当前材质配置
  const getCurrentMaterialConfig = () => {
    return {
      useMaterialProperty: useMaterialProperty.value,
      mode: materialMode.value,
      speed: materialSpeed.value,
      opacity: materialOpacity.value,
      color: materialColors.value[materialMode.value]
    }
  }

  return {
    // 显示控制
    showTargets,
    showRelationships,
    toggleTargets,
    toggleRelationships,
    setShowTargets,
    setShowRelationships,
    
    // 材质控制
    useMaterialProperty,
    materialMode,
    materialSpeed,
    materialOpacity,
    materialColors,
    toggleMaterialProperty,
    setUseMaterialProperty,
    setMaterialMode,
    setMaterialSpeed,
    setMaterialOpacity,
    setMaterialColor,
    getCurrentMaterialConfig
  }
})