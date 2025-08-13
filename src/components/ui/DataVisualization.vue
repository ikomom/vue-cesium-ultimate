<template>
  <div>

    <template v-if="showTargets">
      <!-- 目标点位 -->
      <vc-entity
        v-for="target in targets"
        :key="target.id"
        :id="target.id"
        :position="target.position"
        :billboard="target.billboard"
        :label="target.label"
        :point="target.point"
        @click="onTargetClick(target)"
      />
    </template>
    <template v-if="showRelationships">
      <!-- 普通关系连线 -->
      <vc-entity
        v-for="relation in relations.filter(r => r.materialType === 'normal')"
        :key="relation.id"
        :polyline="relation.polyline"
        @click="onRelationClick(relation)"
      />

      <!-- 飞线效果连线 -->
      <vc-entity
        v-for="relation in relations.filter(r => r.materialType === 'flyline')"
        :key="'fly-' + relation.id"
        @click="onRelationClick(relation)"
      >
        <vc-graphics-polyline
          :positions="relation.polyline.positions"
          :width="relation.polyline.width"
          :material="relation.polyline.material"
          :clamp-to-ground="false"
        />
      </vc-entity>

      <!-- 脉冲效果连线 -->
      <vc-entity
        v-for="relation in relations.filter(r => r.materialType === 'pulse')"
        :key="'pulse-' + relation.id"
        @click="onRelationClick(relation)"
      >
        <vc-graphics-polyline
          :positions="relation.polyline.positions"
          :width="relation.polyline.width"
          :material="relation.polyline.material"
          :clamp-to-ground="false"
        />
      </vc-entity>
    </template>

  </div>
</template>

<script setup>

// Props定义
const props = defineProps({
  targets: {
    type: Array,
    default: () => []
  },
  relations: {
    type: Array,
    default: () => []
  },
  showTargets: {
    type: Boolean,
    default: true
  },
  showRelationships: {
    type: Boolean,
    default: true
  }
})

// Emits定义
const emit = defineEmits(['targetClick', 'relationClick'])

// 事件处理函数
const onTargetClick = (target) => {
  emit('targetClick', target)
}

const onRelationClick = (relation) => {
  emit('relationClick', relation)
}


</script>

<style scoped>
/* 组件样式 */
</style>
