/**
 * 成员表 CRUD 操作
 */

const { queryAll, queryOne, run } = require('./db');

/**
 * 获取所有成员列表
 * @returns {Array} 成员列表
 */
function listMembers() {
  return queryAll(`
    SELECT id, name, avatar, created_at 
    FROM members 
    ORDER BY created_at ASC
  `);
}

/**
 * 根据 ID 获取单个成员
 * @param {number} id 成员 ID
 * @returns {Object|undefined} 成员信息
 */
function getMemberById(id) {
  return queryOne(`
    SELECT id, name, avatar, created_at 
    FROM members 
    WHERE id = ?
  `, [id]);
}

/**
 * 添加新成员
 * @param {Object} data 成员数据
 * @param {string} data.name 成员名称
 * @param {string} [data.avatar] 头像
 * @returns {Object} 新增成员信息（包含 id）
 */
function addMember(data) {
  const { name, avatar = '👤' } = data;

  const result = run(`
    INSERT INTO members (name, avatar) 
    VALUES (?, ?)
  `, [name, avatar]);

  return {
    id: result.lastInsertRowid,
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
 * @param {string} [data.avatar] 头像
 * @returns {Object} 更新结果
 */
function updateMember(id, data) {
  const { name, avatar } = data;

  const result = run(`
    UPDATE members 
    SET name = COALESCE(?, name),
        avatar = COALESCE(?, avatar)
    WHERE id = ?
  `, [name, avatar, id]);

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
  const result = run('DELETE FROM members WHERE id = ?', [id]);

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
