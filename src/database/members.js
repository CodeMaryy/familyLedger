/**
 * 成员表 CRUD 操作
 */

const { getDb } = require('./db');

/**
 * 获取指定账本的成员列表
 * @param {number} bookId 账本 ID
 * @returns {Array} 成员列表
 */
function listMembers(bookId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, book_id, name, avatar, created_at 
    FROM members 
    WHERE book_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(bookId);
}

/**
 * 根据 ID 获取单个成员
 * @param {number} id 成员 ID
 * @returns {Object|undefined} 成员信息
 */
function getMemberById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, book_id, name, avatar, created_at 
    FROM members 
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * 添加新成员
 * @param {Object} data 成员数据
 * @param {number} data.book_id 账本 ID
 * @param {string} data.name 成员名称
 * @param {string} [data.avatar] 头像 URL
 * @returns {Object} 新增成员信息（包含 id）
 */
function addMember(data) {
  const db = getDb();
  const { book_id, name, avatar = '' } = data;

  const stmt = db.prepare(`
    INSERT INTO members (book_id, name, avatar) 
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(book_id, name, avatar);

  return {
    id: result.lastInsertRowid,
    book_id,
    name,
    avatar,
    created_at: new Date().toISOString(),
  };
}

/**
 * 更新成员信息
 * @param {number} id 成员 ID
 * @param {Object} data 更新数据
 * @param {string} [data.name] 成员名称
 * @param {string} [data.avatar] 头像 URL
 * @returns {Object} 更新结果
 */
function updateMember(id, data) {
  const db = getDb();
  const { name, avatar } = data;

  const stmt = db.prepare(`
    UPDATE members 
    SET name = COALESCE(?, name),
        avatar = COALESCE(?, avatar)
    WHERE id = ?
  `);

  const result = stmt.run(name, avatar, id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

/**
 * 删除成员
 * @param {number} id 成员 ID
 * @returns {Object} 删除结果
 */
function deleteMember(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM members WHERE id = ?');
  const result = stmt.run(id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

module.exports = {
  listMembers,
  getMemberById,
  addMember,
  updateMember,
  deleteMember,
};

