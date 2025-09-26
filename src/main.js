import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'vue-cesium/dist/index.css'
// import { VueCesium, vueCesiumConfig } from './plugins/vue-cesium'
import VueCesium from 'vue-cesium'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// app.use(VueCesium, vueCesiumConfig)
app.use(VueCesium)
app.use(ElementPlus)
app.use(createPinia())
app.use(router)

app.mount('#app')
