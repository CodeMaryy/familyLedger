/**
 * 家庭记账本 - Electron 主进程入口
 * 
 * 功能：
 * - 初始化 SQLite 数据库
 * - 注册 IPC 处理器
 * - 创建应用窗口
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase } = require('./src/database/db');
const { registerAllHandlers } = require('./src/ipc/handlers');

// 主窗口引用
let mainWindow = null;

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载前端页面（开发时可以使用本地服务器地址）
  // mainWindow.loadURL('http://localhost:3000');
  
  // 或者加载本地 HTML 文件
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * 应用初始化
 */
app.whenReady().then(async () => {
  try {
    // 1. 初始化数据库
    console.log('正在初始化数据库...');
    initDatabase();
    console.log('数据库初始化完成');

    // 2. 注册所有 IPC 处理器
    console.log('正在注册 IPC 处理器...');
    registerAllHandlers();
    console.log('IPC 处理器注册完成');

    // 3. 创建窗口
    createWindow();

    // macOS 特殊处理：点击 dock 图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('应用初始化失败:', error);
    app.quit();
  }
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  console.log('应用即将退出，正在清理资源...');
});

