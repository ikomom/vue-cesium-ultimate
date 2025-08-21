<template>
  <div class="home-container">
    <div class="header">
      <h1>Vue Cesium Ultimate</h1>
      <p>基于 Vue 3 + Cesium 的地图可视化平台</p>
    </div>

    <div class="navigation-grid">
      <router-link to="/cesium" class="nav-card">
        <div class="card-icon">🗺️</div>
        <h3>Cesium 地图</h3>
        <p>主要的 Cesium 地图界面，包含数据可视化功能</p>
      </router-link>

      <router-link to="/test-map" class="nav-card">
        <div class="card-icon">🧪</div>
        <h3>测试地图</h3>
        <p>地图功能测试页面，包含地图信息和控制功能</p>
      </router-link>

      <router-link to="/demo" class="nav-card">
        <div class="card-icon">📊</div>
        <h3>演示页面</h3>
        <p>功能演示和示例展示</p>
      </router-link>
    </div>

    <div class="footer">
      <p>选择上方任意选项开始使用</p>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.navigation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
}

.nav-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  text-decoration: none;
  color: white;
  transition: all 0.3s ease;
  text-align: center;
}

.nav-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.nav-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.nav-card p {
  opacity: 0.8;
  line-height: 1.6;
}

.footer {
  margin-top: 3rem;
  text-align: center;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }

  .navigation-grid {
    grid-template-columns: 1fr;
  }

  .nav-card {
    padding: 1.5rem;
  }
}
</style>
