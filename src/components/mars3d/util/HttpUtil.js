/**
 * Mars3D 工具模块 - HTTP工具类
 * 提供HTTP请求相关的工具方法
 */

/**
 * HTTP工具类
 * 提供各种HTTP请求方法和工具函数
 */
export default class HttpUtil {
    /**
     * 默认配置
     */
    static defaultConfig = {
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    };

    /**
     * 设置默认配置
     * @param {Object} config - 配置对象
     */
    static setDefaultConfig(config) {
        Object.assign(this.defaultConfig, config);
    }

    /**
     * 发送HTTP请求
     * @param {string} url - 请求URL
     * @param {Object} [options={}] - 请求选项
     * @param {string} [options.method='GET'] - 请求方法
     * @param {Object} [options.headers] - 请求头
     * @param {*} [options.body] - 请求体
     * @param {number} [options.timeout] - 超时时间
     * @param {string} [options.responseType='json'] - 响应类型
     * @param {AbortController} [options.controller] - 中止控制器
     * @returns {Promise} 请求Promise
     */
    static async request(url, options = {}) {
        const config = {
            method: 'GET',
            ...this.defaultConfig,
            ...options
        };

        // 处理请求头
        const headers = new Headers(config.headers);

        // 处理请求体
        let body = config.body;
        if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
            body = JSON.stringify(body);
            if (!headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
        }

        // 创建请求配置
        const fetchOptions = {
            method: config.method,
            headers: headers,
            body: body,
            credentials: config.credentials
        };

        // 添加中止信号
        if (config.controller) {
            fetchOptions.signal = config.controller.signal;
        }

        // 创建超时Promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timeout after ${config.timeout}ms`));
            }, config.timeout);
        });

        try {
            // 发送请求
            const response = await Promise.race([
                fetch(url, fetchOptions),
                timeoutPromise
            ]);

            // 检查响应状态
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 解析响应
            return await this.parseResponse(response, config.responseType);
        } catch (error) {
            throw this.handleError(error, url, config);
        }
    }

    /**
     * GET请求
     * @param {string} url - 请求URL
     * @param {Object} [params] - 查询参数
     * @param {Object} [options] - 请求选项
     * @returns {Promise} 请求Promise
     */
    static get(url, params, options = {}) {
        if (params) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    searchParams.append(key, params[key]);
                }
            });
            url += (url.includes('?') ? '&' : '?') + searchParams.toString();
        }

        return this.request(url, {
            method: 'GET',
            ...options
        });
    }

    /**
     * POST请求
     * @param {string} url - 请求URL
     * @param {*} data - 请求数据
     * @param {Object} [options] - 请求选项
     * @returns {Promise} 请求Promise
     */
    static post(url, data, options = {}) {
        return this.request(url, {
            method: 'POST',
            body: data,
            ...options
        });
    }

    /**
     * PUT请求
     * @param {string} url - 请求URL
     * @param {*} data - 请求数据
     * @param {Object} [options] - 请求选项
     * @returns {Promise} 请求Promise
     */
    static put(url, data, options = {}) {
        return this.request(url, {
            method: 'PUT',
            body: data,
            ...options
        });
    }

    /**
     * DELETE请求
     * @param {string} url - 请求URL
     * @param {Object} [options] - 请求选项
     * @returns {Promise} 请求Promise
     */
    static delete(url, options = {}) {
        return this.request(url, {
            method: 'DELETE',
            ...options
        });
    }

    /**
     * PATCH请求
     * @param {string} url - 请求URL
     * @param {*} data - 请求数据
     * @param {Object} [options] - 请求选项
     * @returns {Promise} 请求Promise
     */
    static patch(url, data, options = {}) {
        return this.request(url, {
            method: 'PATCH',
            body: data,
            ...options
        });
    }

    /**
     * 上传文件
     * @param {string} url - 上传URL
     * @param {File|FormData} file - 文件或FormData
     * @param {Object} [options] - 请求选项
     * @param {Function} [options.onProgress] - 进度回调
     * @returns {Promise} 上传Promise
     */
    static upload(url, file, options = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = file instanceof FormData ? file : new FormData();
            
            if (!(file instanceof FormData)) {
                formData.append('file', file);
            }

            // 设置进度监听
            if (options.onProgress) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        options.onProgress(progress, event);
                    }
                });
            }

            // 设置完成监听
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            });

            // 设置错误监听
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed: Network error'));
            });

            // 设置超时
            xhr.timeout = options.timeout || this.defaultConfig.timeout;
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload failed: Timeout'));
            });

            // 设置请求头
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }

            // 发送请求
            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    /**
     * 下载文件
     * @param {string} url - 下载URL
     * @param {string} [filename] - 文件名
     * @param {Object} [options] - 请求选项
     * @param {Function} [options.onProgress] - 进度回调
     * @returns {Promise} 下载Promise
     */
    static async download(url, filename, options = {}) {
        try {
            const response = await this.request(url, {
                ...options,
                responseType: 'blob'
            });

            // 创建下载链接
            const blob = response;
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = downloadUrl;
            link.download = filename || this.getFilenameFromUrl(url);
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL
            window.URL.revokeObjectURL(downloadUrl);
            
            return blob;
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    /**
     * 并发请求
     * @param {Array<Object>} requests - 请求配置数组
     * @param {number} [concurrency=5] - 并发数
     * @returns {Promise<Array>} 结果数组
     */
    static async concurrent(requests, concurrency = 5) {
        const results = [];
        const executing = [];
        
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            const promise = this.request(request.url, request.options)
                .then(result => ({ index: i, result, error: null }))
                .catch(error => ({ index: i, result: null, error }));
            
            results.push(promise);
            
            if (results.length >= concurrency) {
                executing.push(promise);
                
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                    executing.splice(executing.findIndex(p => p === promise), 1);
                }
            }
        }
        
        const responses = await Promise.all(results);
        return responses.sort((a, b) => a.index - b.index);
    }

    /**
     * 重试请求
     * @param {string} url - 请求URL
     * @param {Object} [options] - 请求选项
     * @param {number} [retries=3] - 重试次数
     * @param {number} [delay=1000] - 重试延迟
     * @returns {Promise} 请求Promise
     */
    static async retry(url, options = {}, retries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i <= retries; i++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;
                
                if (i < retries) {
                    await this.sleep(delay * Math.pow(2, i)); // 指数退避
                }
            }
        }
        
        throw lastError;
    }

    /**
     * 创建请求拦截器
     * @param {Function} interceptor - 拦截器函数
     */
    static addRequestInterceptor(interceptor) {
        if (!this.requestInterceptors) {
            this.requestInterceptors = [];
        }
        this.requestInterceptors.push(interceptor);
    }

    /**
     * 创建响应拦截器
     * @param {Function} interceptor - 拦截器函数
     */
    static addResponseInterceptor(interceptor) {
        if (!this.responseInterceptors) {
            this.responseInterceptors = [];
        }
        this.responseInterceptors.push(interceptor);
    }

    /**
     * 解析响应
     * @param {Response} response - 响应对象
     * @param {string} responseType - 响应类型
     * @returns {Promise} 解析后的数据
     */
    static async parseResponse(response, responseType = 'json') {
        switch (responseType.toLowerCase()) {
            case 'json':
                return await response.json();
            case 'text':
                return await response.text();
            case 'blob':
                return await response.blob();
            case 'arraybuffer':
                return await response.arrayBuffer();
            case 'formdata':
                return await response.formData();
            default:
                return response;
        }
    }

    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {string} url - 请求URL
     * @param {Object} config - 请求配置
     * @returns {Error} 处理后的错误
     */
    static handleError(error, url, config) {
        const enhancedError = new Error(error.message);
        enhancedError.url = url;
        enhancedError.config = config;
        enhancedError.originalError = error;
        
        // 网络错误
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            enhancedError.type = 'NETWORK_ERROR';
            enhancedError.message = 'Network connection failed';
        }
        // 超时错误
        else if (error.message.includes('timeout')) {
            enhancedError.type = 'TIMEOUT_ERROR';
        }
        // 中止错误
        else if (error.name === 'AbortError') {
            enhancedError.type = 'ABORT_ERROR';
            enhancedError.message = 'Request was aborted';
        }
        // HTTP错误
        else if (error.message.includes('HTTP')) {
            enhancedError.type = 'HTTP_ERROR';
        }
        // 其他错误
        else {
            enhancedError.type = 'UNKNOWN_ERROR';
        }
        
        return enhancedError;
    }

    /**
     * 从URL获取文件名
     * @param {string} url - URL
     * @returns {string} 文件名
     */
    static getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            return pathname.split('/').pop() || 'download';
        } catch (error) {
            return 'download';
        }
    }

    /**
     * 检查URL是否有效
     * @param {string} url - URL
     * @returns {boolean} 是否有效
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 构建查询字符串
     * @param {Object} params - 参数对象
     * @returns {string} 查询字符串
     */
    static buildQueryString(params) {
        if (!params || typeof params !== 'object') {
            return '';
        }
        
        const searchParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item));
                } else {
                    searchParams.append(key, value);
                }
            }
        });
        
        return searchParams.toString();
    }

    /**
     * 解析查询字符串
     * @param {string} queryString - 查询字符串
     * @returns {Object} 参数对象
     */
    static parseQueryString(queryString) {
        const params = {};
        const searchParams = new URLSearchParams(queryString);
        
        for (const [key, value] of searchParams) {
            if (params[key]) {
                if (Array.isArray(params[key])) {
                    params[key].push(value);
                } else {
                    params[key] = [params[key], value];
                }
            } else {
                params[key] = value;
            }
        }
        
        return params;
    }

    /**
     * 获取请求头信息
     * @param {string} url - 请求URL
     * @returns {Promise<Object>} 请求头信息
     */
    static async getHeaders(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const headers = {};
            
            for (const [key, value] of response.headers) {
                headers[key] = value;
            }
            
            return headers;
        } catch (error) {
            throw new Error(`Failed to get headers: ${error.message}`);
        }
    }

    /**
     * 检查资源是否存在
     * @param {string} url - 资源URL
     * @returns {Promise<boolean>} 是否存在
     */
    static async exists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取资源大小
     * @param {string} url - 资源URL
     * @returns {Promise<number>} 资源大小（字节）
     */
    static async getSize(url) {
        try {
            const headers = await this.getHeaders(url);
            const contentLength = headers['content-length'];
            return contentLength ? parseInt(contentLength, 10) : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 睡眠函数
     * @param {number} ms - 毫秒数
     * @returns {Promise} Promise
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 创建中止控制器
     * @returns {AbortController} 中止控制器
     */
    static createAbortController() {
        return new AbortController();
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @param {number} [decimals=2] - 小数位数
     * @returns {string} 格式化后的大小
     */
    static formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * 获取MIME类型
     * @param {string} filename - 文件名
     * @returns {string} MIME类型
     */
    static getMimeType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'pdf': 'application/pdf',
            'zip': 'application/zip',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime'
        };
        
        return mimeTypes[extension] || 'application/octet-stream';
    }
}