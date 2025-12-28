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

// 判断是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

  // 根据环境加载不同的页面
  if (isDev) {
    // 开发模式：尝试加载 Vite 开发服务器（优先 3000，备选 3001）
    const tryLoad = async (port) => {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        console.log(`已连接到 Vite 开发服务器 (端口 ${port})`);
      } catch (error) {
        if (port === 3000) {
          console.log('端口 3000 加载失败，尝试 3001...');
          tryLoad(3001);
        } else {
          console.log('连接 Vite 服务器失败，3秒后重试...');
          setTimeout(() => tryLoad(3000), 3000);
        }
      }
    };
    tryLoad(3000);
    // 打开开发者工具（前端调试）
    mainWindow.webContents.openDevTools();
    
    // 监听控制台消息
    mainWindow.webContents.on('console-message', (event, level, message) => {
      console.log(`[Renderer] ${message}`);
    });
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'build', 'index.html'));
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

