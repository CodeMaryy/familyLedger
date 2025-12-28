/**
 * 账目记录表 CRUD 操作及统计功能
 */

const { queryAll, queryOne, run } = require('./db');

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
  const { startDate, endDate, direction, category, member_id, limit, offset } = options;
  
  // 确保 bookId 是数字类型
  const bookIdInt = Number(bookId);

  let sql = `
    SELECT 
      r.id, r.book_id, r.member_id, r.direction, r.category, 
      r.amount, r.date, r.note, r.created_at,
      m.name as member_name
    FROM records r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE CAST(TRIM(CAST(r.book_id AS TEXT)) AS INTEGER) = ?
  `;
  const params = [bookIdInt];

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
    const memberIdInt = Number(member_id);
    sql += ' AND CAST(TRIM(CAST(r.member_id AS TEXT)) AS INTEGER) = ?';
    params.push(memberIdInt);
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

  return queryAll(sql, params);
}

/**
 * 根据 ID 获取单条账目
 * @param {number} id 账目 ID
 * @returns {Object|undefined} 账目信息
 */
function getRecordById(id) {
  const idInt = Number(id);
  return queryOne(`
    SELECT 
      r.id, r.book_id, r.member_id, r.direction, r.category, 
      r.amount, r.date, r.note, r.created_at,
      m.name as member_name
    FROM records r
    LEFT JOIN members m ON r.member_id = m.id
    WHERE CAST(TRIM(CAST(r.id AS TEXT)) AS INTEGER) = ?
  `, [idInt]);
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
  const { book_id, member_id = null, direction, category, amount, date, note = '' } = data;
  
  // 确保所有 id 字段都是数字类型
  const bookIdInt = Number(book_id);
  const memberIdInt = member_id ? Number(member_id) : null;

  const result = run(`
    INSERT INTO records (book_id, member_id, direction, category, amount, date, note) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [bookIdInt, memberIdInt, direction, category, amount, date, note]);

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
  const { member_id, direction, category, amount, date, note } = data;
  
  // 确保所有 id 字段都是数字类型
  const idInt = Number(id);
  const memberIdInt = member_id ? Number(member_id) : null;

  const result = run(`
    UPDATE records 
    SET member_id = COALESCE(?, member_id),
        direction = COALESCE(?, direction),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        date = COALESCE(?, date),
        note = COALESCE(?, note)
    WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?
  `, [memberIdInt, direction, category, amount, date, note, idInt]);

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
  const idInt = Number(id);
  const result = run('DELETE FROM records WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?', [idInt]);

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
  const { startDate, endDate, member_id } = options;
  
  // 确保 bookId 是数字类型
  const bookIdInt = Number(bookId);

  let sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM records 
    WHERE CAST(TRIM(CAST(book_id AS TEXT)) AS INTEGER) = ?
  `;
  const params = [bookIdInt];

  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate);
  }
  if (member_id) {
    const memberIdInt = Number(member_id);
    sql += ' AND CAST(TRIM(CAST(member_id AS TEXT)) AS INTEGER) = ?';
    params.push(memberIdInt);
  }

  const result = queryOne(sql, params);

  return {
    income: result?.income || 0,
    expense: result?.expense || 0,
    balance: (result?.income || 0) - (result?.expense || 0),
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
  const { direction = 'expense', startDate, endDate, member_id } = options;
  
  // 确保 bookId 是数字类型
  const bookIdInt = Number(bookId);

  // 先获取总金额
  let totalSql = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM records 
    WHERE CAST(TRIM(CAST(book_id AS TEXT)) AS INTEGER) = ? AND direction = ?
  `;
  const totalParams = [bookIdInt, direction];

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

  const totalResult = queryOne(totalSql, totalParams);
  const grandTotal = totalResult?.total || 0;

  // 按分类汇总
  let sql = `
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM records 
    WHERE CAST(TRIM(CAST(book_id AS TEXT)) AS INTEGER) = ? AND direction = ?
  `;
  const params = [bookIdInt, direction];

  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate);
  }
  if (member_id) {
    const memberIdInt = Number(member_id);
    sql += ' AND CAST(TRIM(CAST(member_id AS TEXT)) AS INTEGER) = ?';
    params.push(memberIdInt);
  }

  sql += ' GROUP BY category ORDER BY total DESC';

  const results = queryAll(sql, params);

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
