<template>
  <div class="control-panel">
    <!-- 基础显示控制 -->
    <div class="control-group">
      <div class="control-section-title">显示控制</div>
      <label class="control-label">
        <input
          type="checkbox"
          v-model="visualizationStore.showTargets"
          class="control-checkbox"
        />
        显示目标点位
      </label>
      <label class="control-label">
        <input
          type="checkbox"
          v-model="visualizationStore.showRelationships"
          class="control-checkbox"
        />
        显示关系连线
      </label>
    </div>
    
    <!-- 材质控制组 -->
    <div class="control-group">
      <div class="control-section-title">材质控制</div>
      
      <!-- 材质模式切换 -->
      <div class="material-control-item">
        <label class="switch">
          <input 
            type="checkbox" 
            :checked="visualizationStore.useMaterialProperty"
            @change="onMaterialModeToggle"
          >
          <span class="slider"></span>
        </label>
        <span class="material-label">
          {{ visualizationStore.useMaterialProperty ? 'MaterialProperty 模式' : '传统 Material 模式' }}
        </span>
      </div>
      
      <!-- 材质类型选择 -->
      <div class="material-control-item" v-if="visualizationStore.useMaterialProperty">
        <label class="material-type-label">材质类型:</label>
        <select 
          :value="visualizationStore.materialMode" 
          @change="onMaterialTypeChange"
          class="material-select"
        >
          <option value="flyline">飞线效果</option>
          <option value="pulse">脉冲效果</option>
          <option value="dynamic">动态纹理</option>
          <option value="solid">实线</option>
        </select>
      </div>
      
      <!-- 动画速度控制 -->
      <div class="material-control-item" v-if="visualizationStore.useMaterialProperty && visualizationStore.materialMode !== 'solid'">
        <label class="material-type-label">动画速度: {{ visualizationStore.materialSpeed.toFixed(1) }}</label>
        <input 
          type="range" 
          min="0.1" 
          max="5.0" 
          step="0.1"
          :value="visualizationStore.materialSpeed"
          @input="onSpeedChange"
          class="speed-slider"
        />
      </div>
      
      <!-- 透明度控制 -->
      <div class="material-control-item" v-if="visualizationStore.useMaterialProperty">
        <label class="material-type-label">透明度: {{ (visualizationStore.materialOpacity * 100).toFixed(0) }}%</label>
        <input 
          type="range" 
          min="0.1" 
          max="1.0" 
          step="0.05"
          :value="visualizationStore.materialOpacity"
          @input="onOpacityChange"
          class="opacity-slider"
        />
      </div>
      
      <!-- 颜色预设 -->
      <div class="material-control-item" v-if="visualizationStore.useMaterialProperty">
        <label class="material-type-label">颜色预设:</label>
        <div class="color-presets">
          <div 
            v-for="(preset, name) in colorPresets" 
            :key="name"
            class="color-preset"
            :class="{ active: isActivePreset(preset) }"
            :style="{ backgroundColor: `rgba(${preset.r * 255}, ${preset.g * 255}, ${preset.b * 255}, ${preset.a})` }"
            @click="applyColorPreset(preset)"
            :title="name"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useVisualizationStore } from '@/stores/visualization'

// 定义事件
const emit = defineEmits(['materialModeChange'])

// 使用 Pinia store
const visualizationStore = useVisualizationStore()

// 颜色预设
const colorPresets = {
  '青色': { r: 0.0, g: 1.0, b: 1.0, a: 0.8 },
  '橙色': { r: 1.0, g: 0.5, b: 0.0, a: 0.9 },
  '绿色': { r: 0.0, g: 1.0, b: 0.0, a: 0.8 },
  '红色': { r: 1.0, g: 0.0, b: 0.0, a: 0.9 },
  '紫色': { r: 0.8, g: 0.0, b: 1.0, a: 0.8 },
  '蓝色': { r: 0.0, g: 0.5, b: 1.0, a: 0.8 },
  '黄色': { r: 1.0, g: 1.0, b: 0.0, a: 0.8 },
  '白色': { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
}

// 事件处理函数
const onMaterialModeToggle = (event) => {
  const newValue = event.target.checked
  visualizationStore.setUseMaterialProperty(newValue)
  console.log('材质模式切换为:', newValue ? 'MaterialProperty' : '传统 Material')
  emit('materialModeChange', newValue)
}

const onMaterialTypeChange = (event) => {
  visualizationStore.setMaterialMode(event.target.value)
  console.log('材质类型切换为:', event.target.value)
  emit('materialModeChange', visualizationStore.useMaterialProperty)
}

const onSpeedChange = (event) => {
  visualizationStore.setMaterialSpeed(parseFloat(event.target.value))
  emit('materialModeChange', visualizationStore.useMaterialProperty)
}

const onOpacityChange = (event) => {
  visualizationStore.setMaterialOpacity(parseFloat(event.target.value))
  emit('materialModeChange', visualizationStore.useMaterialProperty)
}

const isActivePreset = (preset) => {
  const currentColor = visualizationStore.materialColors[visualizationStore.materialMode]
  return currentColor && 
    Math.abs(currentColor.r - preset.r) < 0.01 &&
    Math.abs(currentColor.g - preset.g) < 0.01 &&
    Math.abs(currentColor.b - preset.b) < 0.01
}

const applyColorPreset = (preset) => {
  visualizationStore.setMaterialColor(visualizationStore.materialMode, preset)
  emit('materialModeChange', visualizationStore.useMaterialProperty)
}
</script>

<style scoped>
/* 控制面板样式 */
.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 8px;
  z-index: 1000;
  min-width: 280px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-group {
  margin-bottom: 15px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-label {
  display: flex;
  align-items: center;
  color: white;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  margin-bottom: 8px;
}

.control-checkbox {
  margin-right: 8px;
  cursor: pointer;
}

/* 材质控制样式 */
.control-section-title {
  color: #4ECDC4;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 6px;
}

.material-control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.material-control-item:first-child {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.material-label {
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
}

.material-type-label {
  color: #E0E0E0;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

/* 切换开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #555;
  transition: 0.3s;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4ECDC4;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider:hover {
  box-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
}

/* 选择框样式 */
.material-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  padding: 6px 8px;
  font-size: 12px;
  width: 100%;
}

.material-select option {
  background: #333;
  color: white;
}

/* 滑块样式 */
.speed-slider,
.opacity-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  width: 100%;
}

.speed-slider::-webkit-slider-thumb,
.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #4ECDC4;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
}

.speed-slider::-moz-range-thumb,
.opacity-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #4ECDC4;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
}

/* 颜色预设样式 */
.color-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.color-preset {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.color-preset:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.color-preset.active {
  border-color: #4ECDC4;
  box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
}
</style>
