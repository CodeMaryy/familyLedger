/**
 * 账本表 CRUD 操作
 */

const { getDb } = require('./db');

/**
 * 获取所有账本列表
 * @returns {Array} 账本列表
 */
function listBooks() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, description, created_at 
    FROM books 
    ORDER BY created_at DESC
  `);
  return stmt.all();
}

/**
 * 根据 ID 获取单个账本
 * @param {number} id 账本 ID
 * @returns {Object|undefined} 账本信息
 */
function getBookById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, description, created_at 
    FROM books 
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * 添加新账本
 * @param {Object} data 账本数据
 * @param {string} data.name 账本名称
 * @param {string} [data.description] 账本描述
 * @returns {Object} 新增账本信息（包含 id）
 */
function addBook(data) {
  const db = getDb();
  const { name, description = '' } = data;

  const stmt = db.prepare(`
    INSERT INTO books (name, description) 
    VALUES (?, ?)
  `);

  const result = stmt.run(name, description);

  return {
    id: result.lastInsertRowid,
    name,
    description,
    created_at: new Date().toISOString(),
  };
}

/**
 * 更新账本信息
 * @param {number} id 账本 ID
 * @param {Object} data 更新数据
 * @param {string} [data.name] 账本名称
 * @param {string} [data.description] 账本描述
 * @returns {Object} 更新结果
 */
function updateBook(id, data) {
  const db = getDb();
  const { name, description } = data;

  const stmt = db.prepare(`
    UPDATE books 
    SET name = COALESCE(?, name),
        description = COALESCE(?, description)
    WHERE id = ?
  `);

  const result = stmt.run(name, description, id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

/**
 * 删除账本
 * @param {number} id 账本 ID
 * @returns {Object} 删除结果
 */
function deleteBook(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM books WHERE id = ?');
  const result = stmt.run(id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

module.exports = {
  listBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
};

