/**
 * 账目记录表 CRUD 操作及统计功能
 */

const { getDb } = require('./db');

/**
 * 获取指定账本的账目列表
 * @param {number} bookId 账本 ID
 * @param {Object} [options] 查询选项
 * @param {string} [options.startDate] 开始日期
 * @param {string} [options.endDate] 结束日期
 * @param {string} [options.direction] 类型：income/expense
 * @param {string} [options.category] 分类
 * @param {number} [options.member_id] 成员 ID
 * @param {number} [options.limit] 返回条数限制
 * @param {number} [options.offset] 偏移量
 * @returns {Array} 账目列表
 */
function listRecords(bookId, options = {}) {
  const db = getDb();
  const { startDate, endDate, direction, category, member_id, limit, offset } = options;

  let sql = `
    SELECT 
      r.id, r.book_id, r.member_id, r.direction, r.category, 
      r.amount, r.date, r.note, r.created_at,
      m.name as member_name
    FROM records r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE r.book_id = ?
  `;
  const params = [bookId];

  // 动态添加查询条件
  if (startDate) {
    sql += ' AND r.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND r.date <= ?';
    params.push(endDate);
  }
  if (direction) {
    sql += ' AND r.direction = ?';
    params.push(direction);
  }
  if (category) {
    sql += ' AND r.category = ?';
    params.push(category);
  }
  if (member_id) {
    sql += ' AND r.member_id = ?';
    params.push(member_id);
  }

  sql += ' ORDER BY r.date DESC, r.created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * 根据 ID 获取单条账目
 * @param {number} id 账目 ID
 * @returns {Object|undefined} 账目信息
 */
function getRecordById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
      r.id, r.book_id, r.member_id, r.direction, r.category, 
      r.amount, r.date, r.note, r.created_at,
      m.name as member_name
    FROM records r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE r.id = ?
  `);
  return stmt.get(id);
}

/**
 * 添加新账目
 * @param {Object} data 账目数据
 * @param {number} data.book_id 账本 ID
 * @param {number} [data.member_id] 成员 ID
 * @param {string} data.direction 类型：income/expense
 * @param {string} data.category 分类
 * @param {number} data.amount 金额
 * @param {string} data.date 日期 (YYYY-MM-DD)
 * @param {string} [data.note] 备注
 * @returns {Object} 新增账目信息（包含 id）
 */
function addRecord(data) {
  const db = getDb();
  const { book_id, member_id = null, direction, category, amount, date, note = '' } = data;

  const stmt = db.prepare(`
    INSERT INTO records (book_id, member_id, direction, category, amount, date, note) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(book_id, member_id, direction, category, amount, date, note);

  return {
    id: result.lastInsertRowid,
    book_id,
    member_id,
    direction,
    category,
    amount,
    date,
    note,
    created_at: new Date().toISOString(),
  };
}

/**
 * 更新账目信息
 * @param {number} id 账目 ID
 * @param {Object} data 更新数据
 * @returns {Object} 更新结果
 */
function updateRecord(id, data) {
  const db = getDb();
  const { member_id, direction, category, amount, date, note } = data;

  const stmt = db.prepare(`
    UPDATE records 
    SET member_id = COALESCE(?, member_id),
        direction = COALESCE(?, direction),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        note = COALESCE(?, note)
    WHERE id = ?
  `);

  const result = stmt.run(member_id, direction, category, amount, date, note, id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

/**
 * 删除账目
 * @param {number} id 账目 ID
 * @returns {Object} 删除结果
 */
function deleteRecord(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM records WHERE id = ?');
  const result = stmt.run(id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

/**
 * 获取账目汇总统计
 * @param {number} bookId 账本 ID
 * @param {Object} [options] 查询选项
 * @param {string} [options.startDate] 开始日期
 * @param {string} [options.endDate] 结束日期
 * @param {number} [options.member_id] 成员 ID
 * @returns {Object} 汇总统计 { income, expense, balance }
 */
function getSummary(bookId, options = {}) {
  const db = getDb();
  const { startDate, endDate, member_id } = options;

  let sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM records 
    WHERE book_id = ?
  `;
  const params = [bookId];

  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate);
  }
  if (member_id) {
    sql += ' AND member_id = ?';
    params.push(member_id);
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params);

  return {
    income: result.income || 0,
    expense: result.expense || 0,
    balance: (result.income || 0) - (result.expense || 0),
  };
}

/**
 * 按分类汇总统计
 * @param {number} bookId 账本 ID
 * @param {Object} [options] 查询选项
 * @param {string} [options.direction] 类型：income/expense
 * @param {string} [options.startDate] 开始日期
 * @param {string} [options.endDate] 结束日期
 * @param {number} [options.member_id] 成员 ID
 * @returns {Array} 分类汇总列表 [{ category, total, count, percentage }]
 */
function getCategorySummary(bookId, options = {}) {
  const db = getDb();
  const { direction = 'expense', startDate, endDate, member_id } = options;

  // 先获取总金额
  let totalSql = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM records 
    WHERE book_id = ? AND direction = ?
  `;
  const totalParams = [bookId, direction];

  if (startDate) {
    totalSql += ' AND date >= ?';
    totalParams.push(startDate);
  }
  if (endDate) {
    totalSql += ' AND date <= ?';
    totalParams.push(endDate);
  }
  if (member_id) {
    totalSql += ' AND member_id = ?';
    totalParams.push(member_id);
  }

  const totalStmt = db.prepare(totalSql);
  const totalResult = totalStmt.get(...totalParams);
  const grandTotal = totalResult.total || 0;

  // 按分类汇总
  let sql = `
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM records 
    WHERE book_id = ? AND direction = ?
  `;
  const params = [bookId, direction];

  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate);
  }
  if (member_id) {
    sql += ' AND member_id = ?';
    params.push(member_id);
  }

  sql += ' GROUP BY category ORDER BY total DESC';

  const stmt = db.prepare(sql);
  const results = stmt.all(...params);

  // 计算百分比
  return results.map((item) => ({
    category: item.category,
    total: item.total,
    count: item.count,
    percentage: grandTotal > 0 ? Number(((item.total / grandTotal) * 100).toFixed(2)) : 0,
  }));
}

module.exports = {
  listRecords,
  getRecordById,
  addRecord,
  updateRecord,
  deleteRecord,
  getSummary,
  getCategorySummary,
};

