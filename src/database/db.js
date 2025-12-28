/**
 * 数据库初始化和连接管理
 * 
 * 使用 sql.js (WebAssembly 版 SQLite)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 数据库实例（单例）
let db = null;
let dbPath = null;

/**
 * 获取数据库文件路径
 * @returns {string} 数据库文件完整路径
 */
function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'family_account.db');
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * 初始化数据库
 * 创建所有必要的表结构
 */
async function initDatabase() {
  dbPath = getDbPath();
  console.log('数据库路径:', dbPath);

  // 初始化 sql.js
  const SQL = await initSqlJs();

  // 尝试加载已有数据库
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('已加载现有数据库');
    } else {
      db = new SQL.Database();
      console.log('创建新数据库');
    }
  } catch (error) {
    console.error('加载数据库失败，创建新数据库:', error);
    db = new SQL.Database();
  }

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 创建表结构
  createTables();

  // 定期保存数据库（每30秒）
  setInterval(saveDatabase, 30000);

  // 应用退出时保存
  app.on('before-quit', saveDatabase);

  return db;
}

/**
 * 创建数据库表
 */
function createTables() {
  // 账本表
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 成员表
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 账目记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER,
      direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    )
  `);

  // 预算表
  // period: monthly(月度) / quarterly(季度) / yearly(年度)
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER,
      direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('monthly', 'quarterly', 'yearly')),
      date TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    )
  `);

  // 创建索引以提高查询性能
  db.run(`CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_book_id ON records(book_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_direction ON records(direction)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_category ON records(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_budgets_book_id ON budgets(book_id)`);

  // 保存到文件
  saveDatabase();

  console.log('数据库表创建完成');
}

/**
 * 获取数据库实例
 * @returns {Database} sql.js 数据库实例
 */
function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

/**
 * 执行查询并返回所有结果
 * @param {string} sql SQL 语句
 * @param {Array} params 参数
 * @returns {Array} 结果数组
 */
function queryAll(sql, params = []) {
  // sql.js 不允许 undefined，需要转换为 null
  const sanitizedParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  stmt.bind(sanitizedParams);
  
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * 执行查询并返回第一行
 * @param {string} sql SQL 语句
 * @param {Array} params 参数
 * @returns {Object|undefined} 第一行结果
 */
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

/**
 * 执行更新/插入语句
 * @param {string} sql SQL 语句
 * @param {Array} params 参数
 * @returns {Object} { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  // sql.js 不允许 undefined，需要转换为 null
  const sanitizedParams = params.map(p => p === undefined ? null : p);
  db.run(sql, sanitizedParams);
  const changes = db.getRowsModified();
  const lastResult = queryOne('SELECT last_insert_rowid() as id');
  const lastInsertRowid = lastResult ? lastResult.id : 0;
  
  // 保存数据库
  saveDatabase();
  
  return { changes, lastInsertRowid };
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('数据库连接已关闭');
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  getDbPath,
  queryAll,
  queryOne,
  run,
  saveDatabase,
};
