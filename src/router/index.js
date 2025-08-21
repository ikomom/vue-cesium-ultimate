import { createRouter, createWebHistory } from 'vue-router'
import CesiumView from '@/containers/CesiumView.vue'
import ComponentDemo from '@/views/ComponentDemo.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: CesiumView,
    meta: {
      title: '首页 - Cesium地图',
    },
  },
  {
    path: '/cesium',
    name: 'Cesium',
    component: CesiumView,
    meta: {
      title: 'Cesium地图视图',
    },
  },
  {
    path: '/demo',
    name: 'Demo',
    component: ComponentDemo,
    meta: {
      title: '组件演示',
    },
  },
  {
    path: '/test-map',
    name: 'TestMap',
    component: () => import('@/views/TestMap.vue'),
    meta: {
      title: '测试地图页面',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
