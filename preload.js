/**
 * Electron 预加载脚本
 * 
 * 在渲染进程中暴露安全的 API
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 创建 IPC 调用包装器
 * @param {string} channel IPC 通道名称
 * @returns {Function} 调用函数
 */
function createInvoker(channel) {
  return (...args) => ipcRenderer.invoke(channel, ...args);
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('api', {
  // ==================== 账本操作 ====================
  books: {
    /**
     * 获取所有账本列表
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    list: createInvoker('books:list'),

    /**
     * 添加新账本
     * @param {Object} data { name, description }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    add: createInvoker('books:add'),

    /**
     * 更新账本
     * @param {number} id 账本 ID
     * @param {Object} data { name?, description? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    update: (id, data) => ipcRenderer.invoke('books:update', { id, data }),

    /**
     * 删除账本
     * @param {number} id 账本 ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    delete: createInvoker('books:delete'),
  },

  // ==================== 成员操作 ====================
  members: {
    /**
     * 获取指定账本的成员列表
     * @param {number} bookId 账本 ID
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    list: createInvoker('members:list'),

    /**
     * 添加新成员
     * @param {Object} data { book_id, name, avatar? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    add: createInvoker('members:add'),

    /**
     * 更新成员
     * @param {number} id 成员 ID
     * @param {Object} data { name?, avatar? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    update: (id, data) => ipcRenderer.invoke('members:update', { id, data }),

    /**
     * 删除成员
     * @param {number} id 成员 ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    delete: createInvoker('members:delete'),
  },

  // ==================== 账目操作 ====================
  records: {
    /**
     * 获取指定账本的账目列表
     * @param {number} bookId 账本 ID
     * @param {Object} [options] { startDate?, endDate?, direction?, category?, member_id?, limit?, offset? }
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    list: (bookId, options = {}) => ipcRenderer.invoke('records:list', { bookId, options }),

    /**
     * 添加新账目
     * @param {Object} data { book_id, member_id?, direction, category, amount, date, note? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    add: createInvoker('records:add'),

    /**
     * 更新账目
     * @param {number} id 账目 ID
     * @param {Object} data { member_id?, direction?, category?, amount?, date?, note? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    update: (id, data) => ipcRenderer.invoke('records:update', { id, data }),

    /**
     * 删除账目
     * @param {number} id 账目 ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    delete: createInvoker('records:delete'),

    /**
     * 获取账目汇总统计
     * @param {number} bookId 账本 ID
     * @param {Object} [options] { startDate?, endDate?, member_id? }
     * @returns {Promise<{success: boolean, data?: {income, expense, balance}, error?: string}>}
     */
    summary: (bookId, options = {}) => ipcRenderer.invoke('records:summary', { bookId, options }),

    /**
     * 获取分类汇总统计
     * @param {number} bookId 账本 ID
     * @param {Object} [options] { direction?, startDate?, endDate?, member_id? }
     * @returns {Promise<{success: boolean, data?: Array<{category, total, count, percentage}>, error?: string}>}
     */
    categorySummary: (bookId, options = {}) => ipcRenderer.invoke('records:categorySummary', { bookId, options }),
  },

  // ==================== 预算操作 ====================
  budgets: {
    /**
     * 获取指定账本的预算列表
     * @param {number} bookId 账本 ID
     * @param {Object} [options] { direction?, period?, member_id? }
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    list: (bookId, options = {}) => ipcRenderer.invoke('budgets:list', { bookId, options }),

    /**
     * 添加新预算
     * @param {Object} data { book_id, member_id?, direction, category, amount, period, date }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    add: createInvoker('budgets:add'),

    /**
     * 更新预算
     * @param {number} id 预算 ID
     * @param {Object} data { member_id?, direction?, category?, amount?, period?, date? }
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    update: (id, data) => ipcRenderer.invoke('budgets:update', { id, data }),

    /**
     * 删除预算
     * @param {number} id 预算 ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    delete: createInvoker('budgets:delete'),

    /**
     * 获取预算执行情况
     * @param {number} bookId 账本 ID
     * @param {Object} [options] { startDate?, endDate? }
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    execution: (bookId, options = {}) => ipcRenderer.invoke('budgets:execution', { bookId, options }),
  },
});

