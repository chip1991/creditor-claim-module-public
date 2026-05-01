import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10 分钟，因为采集任务可能需要较长时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('satoken');
    if (token) {
      config.headers['satoken'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理 401 未授权
api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
      if (payload.code === 'OK') {
        return { ...response, data: payload.data };
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('satoken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
