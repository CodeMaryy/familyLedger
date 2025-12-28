/**
 * 账本表 CRUD 操作
 */

const { queryAll, queryOne, run } = require('./db');

/**
 * 获取所有账本列表
 * @returns {Array} 账本列表
 */
function listBooks() {
  return queryAll(`
    SELECT id, name, description, created_at 
    FROM books 
    ORDER BY created_at DESC
  `);
}

/**
 * 根据 ID 获取单个账本
 * @param {number} id 账本 ID
 * @returns {Object|undefined} 账本信息
 */
function getBookById(id) {
  const idInt = Number(id);
  return queryOne(`
    SELECT id, name, description, created_at 
    FROM books 
    WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?
  `, [idInt]);
}

/**
 * 添加新账本
 * @param {Object} data 账本数据
 * @param {string} data.name 账本名称
 * @param {string} [data.description] 账本描述
 * @returns {Object} 新增账本信息（包含 id）
 */
function addBook(data) {
  const { name, description = '' } = data;

  const result = run(`
    INSERT INTO books (name, description) 
    VALUES (?, ?)
  `, [name, description]);

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
  const { name, description } = data;
  
  // 确保 id 是数字类型
  const idInt = Number(id);

  const result = run(`
    UPDATE books 
    SET name = COALESCE(?, name),
        description = COALESCE(?, description)
    WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?
  `, [name, description, idInt]);

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
  const idInt = Number(id);
  const result = run('DELETE FROM books WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?', [idInt]);

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
