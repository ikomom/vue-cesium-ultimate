<template>
  <!-- 创建/编辑图层对话框 -->
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h4>{{ isEdit ? '编辑图层' : '新增图层' }}</h4>
        <button class="btn-close" @click="closeDialog">
          <i class="icon-close"></i>
        </button>
      </div>

      <div class="dialog-content">
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label>图层名称</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="请输入图层名称"
              required
              ref="nameInput"
            />
          </div>

          <div class="form-group">
            <label>层级顺序</label>
            <input
              v-model.number="formData.zIndex"
              type="number"
              placeholder="数值越大越靠前"
              min="0"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="formData.visible" type="checkbox" />
              <span>默认可见</span>
            </label>
          </div>
        </form>
      </div>

      <div class="dialog-footer">
        <button class="btn-secondary" @click="closeDialog">取消</button>
        <button class="btn-primary" @click="submitForm">
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  editingLayer: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'close',
  'submit'
])

const nameInput = ref(null)

// 表单数据
const formData = ref({
  name: '',
  zIndex: 0,
  visible: true,
})


// 重置表单
const resetForm = () => {
  formData.value = {
    name: '',
    zIndex: 0,
    visible: true,
  }
}

// 关闭对话框
const closeDialog = () => {
  emit('close')
  resetForm()
}

// 处理遮罩层点击
const handleOverlayClick = () => {
  closeDialog()
}

// 提交表单
const submitForm = () => {
  if (!formData.value.name.trim()) {
    alert('请填写图层名称')
    nameInput.value?.focus()
    return
  }

  emit('submit', {
    ...formData.value,
    name: formData.value.name.trim()
  })

  closeDialog()
}

// 监听编辑图层变化
watch(() => props.editingLayer, (newLayer) => {
  if (newLayer && props.isEdit) {
    formData.value = {
      name: newLayer.name,
      zIndex: newLayer.zIndex,
      visible: newLayer.visible,
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听对话框显示状态，自动聚焦输入框
watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      nameInput.value?.focus()
    })
  }
})

</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog {
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  color: #ffffff;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.btn-close {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #ffffff;
}

.dialog-content {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #ffffff;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  background: rgba(255, 255, 255, 0.15);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0 !important;
}

.checkbox-label input {
  width: auto !important;
  margin-right: 8px;
  margin-bottom: 0;
}

.checkbox-label span {
  font-size: 14px;
  color: #ffffff;
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  font-weight: 500;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 图标样式 */
.icon-close::before {
  content: '✕';
  font-size: 12px;
}
</style>
