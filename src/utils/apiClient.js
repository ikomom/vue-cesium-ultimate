// Axios API客户端配置
import axios from 'axios'

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api', // 基础URL
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.params || config.data)

    // 添加时间戳防止缓存
    // if (config.method === 'get') {
    //   config.params = {
    //     ...config.params,
    //     _t: Date.now(),
    //   }
    // }

    return config
  },
  (error) => {
    // 对请求错误做些什么
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    console.log('API响应:', response.config.url, response.data)
    return response.data
  },
  (error) => {
    // 对响应错误做点什么
    console.error('响应错误:', error.response?.status, error.response?.data || error.message)

    // 统一错误处理
    const errorMessage = error.response?.data?.message || error.message || '网络请求失败'

    return Promise.reject({
      success: false,
      message: errorMessage,
      status: error.response?.status,
      data: null,
    })
  },
)

// 导出axios实例和API方法
export { apiClient }
