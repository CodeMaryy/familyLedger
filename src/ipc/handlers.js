/**
 * IPC 处理器注册
 * 
 * 将所有数据库操作暴露给渲染进程
 */

const { ipcMain } = require('electron');

// 导入数据库操作模块
const books = require('../database/books');
const members = require('../database/members');
const records = require('../database/records');
const budgets = require('../database/budgets');

/**
 * 通用错误处理包装器
 * @param {Function} handler 处理函数
 * @returns {Function} 包装后的处理函数
 */
function wrapHandler(handler) {
  return async (event, ...args) => {
    try {
      const result = await handler(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Handler Error:', error);
      return { success: false, error: error.message };
    }
  };
}

/**
 * 注册账本相关 IPC 处理器
 */
function registerBookHandlers() {
  // 获取账本列表
  ipcMain.handle('books:list', wrapHandler(() => {
    return books.listBooks();
  }));

  // 添加账本
  ipcMain.handle('books:add', wrapHandler((data) => {
    return books.addBook(data);
  }));

  // 更新账本
  ipcMain.handle('books:update', wrapHandler(({ id, data }) => {
    return books.updateBook(id, data);
  }));

  // 删除账本
  ipcMain.handle('books:delete', wrapHandler((id) => {
    return books.deleteBook(id);
  }));
}

/**
 * 注册成员相关 IPC 处理器
 */
function registerMemberHandlers() {
  // 获取成员列表（全局成员，不再按账本区分）
  ipcMain.handle('members:list', wrapHandler(() => {
    return members.listMembers();
  }));

  // 添加成员
  ipcMain.handle('members:add', wrapHandler((data) => {
    return members.addMember(data);
  }));

  // 更新成员
  ipcMain.handle('members:update', wrapHandler(({ id, data }) => {
    return members.updateMember(id, data);
  }));

  // 删除成员
  ipcMain.handle('members:delete', wrapHandler((id) => {
    return members.deleteMember(id);
  }));
}

/**
 * 注册账目相关 IPC 处理器
 */
function registerRecordHandlers() {
  // 获取账目列表（按账本）
  ipcMain.handle('records:list', wrapHandler(({ bookId, options }) => {
    return records.listRecords(bookId, options);
  }));

  // 添加账目
  ipcMain.handle('records:add', wrapHandler((data) => {
    return records.addRecord(data);
  }));

  // 更新账目
  ipcMain.handle('records:update', wrapHandler(({ id, data }) => {
    return records.updateRecord(id, data);
  }));

  // 删除账目
  ipcMain.handle('records:delete', wrapHandler((id) => {
    return records.deleteRecord(id);
  }));

  // 获取账目汇总统计
  ipcMain.handle('records:summary', wrapHandler(({ bookId, options }) => {
    return records.getSummary(bookId, options);
  }));

  // 获取分类汇总统计
  ipcMain.handle('records:categorySummary', wrapHandler(({ bookId, options }) => {
    return records.getCategorySummary(bookId, options);
  }));
}

/**
 * 注册预算相关 IPC 处理器
 */
function registerBudgetHandlers() {
  // 获取预算列表（按账本）
  ipcMain.handle('budgets:list', wrapHandler(({ bookId, options }) => {
    return budgets.listBudgets(bookId, options);
  }));

  // 添加预算
  ipcMain.handle('budgets:add', wrapHandler((data) => {
    return budgets.addBudget(data);
  }));

  // 更新预算
  ipcMain.handle('budgets:update', wrapHandler(({ id, data }) => {
    return budgets.updateBudget(id, data);
  }));

  // 删除预算
  ipcMain.handle('budgets:delete', wrapHandler((id) => {
    return budgets.deleteBudget(id);
  }));

  // 获取预算执行情况
  ipcMain.handle('budgets:execution', wrapHandler(({ bookId, options }) => {
    return budgets.getBudgetExecution(bookId, options);
  }));
}

/**
 * 注册所有 IPC 处理器
 */
function registerAllHandlers() {
  registerBookHandlers();
  registerMemberHandlers();
  registerRecordHandlers();
  registerBudgetHandlers();

  console.log('所有 IPC 处理器已注册');
}

module.exports = {
  registerAllHandlers,
};

