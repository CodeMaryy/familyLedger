/**
 * 预算表 CRUD 操作
 */

const { queryAll, queryOne, run } = require('./db');

/**
 * 获取指定账本的预算列表
 * @param {number} bookId 账本 ID
 * @param {Object} [options] 查询选项
 * @param {string} [options.direction] 类型：income/expense
 * @param {string} [options.period] 周期
 * @param {number} [options.member_id] 成员 ID
 * @returns {Array} 预算列表
 */
function listBudgets(bookId, options = {}) {
  const { direction, period, member_id } = options;
  
  // 确保 bookId 是数字类型
  const bookIdInt = Number(bookId);

  let sql = `
    SELECT 
      b.id, b.book_id, b.member_id, b.direction, b.category, 
      b.amount, b.period, b.date,
      m.name as member_name
    FROM budgets b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE CAST(TRIM(CAST(b.book_id AS TEXT)) AS INTEGER) = ?
  `;
  const params = [bookIdInt];

  if (direction) {
    sql += ' AND b.direction = ?';
    params.push(direction);
  }
  if (period) {
    sql += ' AND b.period = ?';
    params.push(period);
  }
  if (member_id) {
    const memberIdInt = Number(member_id);
    sql += ' AND CAST(TRIM(CAST(b.member_id AS TEXT)) AS INTEGER) = ?';
    params.push(memberIdInt);
  }

  sql += ' ORDER BY b.category ASC';

  return queryAll(sql, params);
}

/**
 * 根据 ID 获取单个预算
 * @param {number} id 预算 ID
 * @returns {Object|undefined} 预算信息
 */
function getBudgetById(id) {
  const idInt = Number(id);
  return queryOne(`
    SELECT 
      b.id, b.book_id, b.member_id, b.direction, b.category, 
      b.amount, b.period, b.date,
      m.name as member_name
    FROM budgets b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE CAST(TRIM(CAST(b.id AS TEXT)) AS INTEGER) = ?
  `, [idInt]);
}

/**
 * 添加或更新预算（按 book_id + category 判断是否存在）
 * @param {Object} data 预算数据
 * @param {number} data.book_id 账本 ID
 * @param {number} [data.member_id] 成员 ID
 * @param {string} data.direction 类型：income/expense
 * @param {string} data.category 分类
 * @param {number} data.amount 金额
 * @param {string} data.period 周期 (monthly/quarterly/yearly)
 * @param {string} data.date 生效日期
 * @returns {Object} 预算信息（包含 id）
 */
function addBudget(data) {
  const { book_id, member_id = null, direction, category, amount, period, date } = data;

  // 参数验证：确保必需字段不为 undefined
  if (book_id === undefined || direction === undefined || category === undefined || 
      amount === undefined || period === undefined || date === undefined) {
    throw new Error('预算数据不完整：book_id, direction, category, amount, period, date 为必需字段');
  }
  
  // 确保所有 id 字段都是数字类型
  const bookIdInt = Number(book_id);
  const memberIdInt = member_id ? Number(member_id) : null;

  // 查询是否已存在相同 book_id + category 的预算，取最新的一条
  const existing = queryOne(`
    SELECT id FROM budgets 
    WHERE CAST(TRIM(CAST(book_id AS TEXT)) AS INTEGER) = ? AND category = ?
    ORDER BY id DESC
    LIMIT 1
  `, [bookIdInt, category]);

  if (existing) {
    // 存在则更新
    const existingIdInt = Number(existing.id);
    run(`
      UPDATE budgets 
      SET member_id = ?,
          direction = ?,
          amount = ?,
          period = ?,
          date = ?
      WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?
    `, [memberIdInt, direction, amount, period, date, existingIdInt]);

    return {
      id: existing.id,
      book_id,
      member_id,
      direction,
      category,
      amount,
      period,
      date,
    };
  } else {
    // 不存在则新增
    const result = run(`
      INSERT INTO budgets (book_id, member_id, direction, category, amount, period, date) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [bookIdInt, memberIdInt, direction, category, amount, period, date]);

    return {
      id: result.lastInsertRowid,
      book_id,
      member_id,
      direction,
      category,
      amount,
      period,
      date,
    };
  }
}

/**
 * 更新预算信息
 * @param {number} id 预算 ID
 * @param {Object} data 更新数据
 * @returns {Object} 更新结果
 */
function updateBudget(id, data) {
  const { member_id, direction, category, amount, period, date } = data;
  
  // 确保所有 id 字段都是数字类型
  const idInt = Number(id);
  const memberIdInt = member_id ? Number(member_id) : null;

  const result = run(`
    UPDATE budgets 
    SET member_id = COALESCE(?, member_id),
        direction = COALESCE(?, direction),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        period = COALESCE(?, period),
        date = COALESCE(?, date)
    WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?
  `, [memberIdInt, direction, category, amount, period, date, idInt]);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
}

/**
 * 删除预算
 * @param {number} id 预算 ID
 * @returns {Object} 删除结果
 */
function deleteBudget(id) {
  console.log('[Database] deleteBudget called with id:', id);
  const idInt = Number(id);
  const result = run('DELETE FROM budgets WHERE CAST(TRIM(CAST(id AS TEXT)) AS INTEGER) = ?', [idInt]);
  console.log('[Database] deleteBudget SQL result:', result);

  const deleteResult = {
    success: result.changes > 0,
    changes: result.changes,
  };
  console.log('[Database] deleteBudget returning:', deleteResult);
  return deleteResult;
}

/**
 * 获取预算执行情况
 * @param {number} bookId 账本 ID
 * @param {Object} [options] 查询选项
 * @param {string} [options.startDate] 统计开始日期
 * @param {string} [options.endDate] 统计结束日期
 * @returns {Array} 预算执行情况列表
 */
function getBudgetExecution(bookId, options = {}) {
  const { startDate, endDate } = options;
  
  // 确保 bookId 是数字类型
  const bookIdInt = Number(bookId);

  // 获取所有预算
  const budgets = listBudgets(bookIdInt);

  // 获取实际支出/收入
  let sql = `
    SELECT category, direction, SUM(amount) as actual
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

  sql += ' GROUP BY category, direction';

  const actuals = queryAll(sql, params);

  // 创建实际金额映射
  const actualMap = {};
  actuals.forEach((item) => {
    const key = `${item.direction}:${item.category}`;
    actualMap[key] = item.actual;
  });

  // 合并预算和实际数据
  return budgets.map((budget) => {
    const key = `${budget.direction}:${budget.category}`;
    const actual = actualMap[key] || 0;
    const remaining = budget.amount - actual;
    const percentage = budget.amount > 0 ? Number(((actual / budget.amount) * 100).toFixed(2)) : 0;

    return {
      ...budget,
      actual,
      remaining,
      percentage,
      isOverBudget: remaining < 0,
    };
  });
}

module.exports = {
  listBudgets,
  getBudgetById,
  addBudget,
  updateBudget,
  deleteBudget,
  getBudgetExecution,
};
