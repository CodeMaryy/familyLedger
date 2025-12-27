/**
 * 数据库初始化和连接管理
 * 
 * 使用 better-sqlite3 同步 API，性能更好
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// 数据库实例（单例）
let db = null;

/**
 * 获取数据库文件路径
 * @returns {string} 数据库文件完整路径
 */
function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'family_account.db');
}

/**
 * 初始化数据库
 * 创建所有必要的表结构
 */
function initDatabase() {
  const dbPath = getDbPath();
  console.log('数据库路径:', dbPath);

  // 创建数据库连接
  db = new Database(dbPath, { verbose: console.log });

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 创建表结构
  createTables();

  return db;
}

/**
 * 创建数据库表
 */
function createTables() {
  // 账本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 成员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `);

  // 账目记录表
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_book_id ON members(book_id);
    CREATE INDEX IF NOT EXISTS idx_records_book_id ON records(book_id);
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
    CREATE INDEX IF NOT EXISTS idx_records_direction ON records(direction);
    CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_book_id ON budgets(book_id);
  `);

  console.log('数据库表创建完成');
}

/**
 * 获取数据库实例
 * @returns {Database} better-sqlite3 数据库实例
 */
function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

/**
 * 关闭数据库连接
 */
function closeDatabase() {
  if (db) {
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
};

