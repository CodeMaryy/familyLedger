/**
 * 预算表 CRUD 操作
 */

const { getDb } = require('./db');

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
  const db = getDb();
  const { direction, period, member_id } = options;

  let sql = `
    SELECT 
      b.id, b.book_id, b.member_id, b.direction, b.category, 
      b.amount, b.period, b.date,
      m.name as member_name
    FROM budgets b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE b.book_id = ?
  `;
  const params = [bookId];

  if (direction) {
    sql += ' AND b.direction = ?';
    params.push(direction);
  }
  if (period) {
    sql += ' AND b.period = ?';
    params.push(period);
  }
  if (member_id) {
    sql += ' AND b.member_id = ?';
    params.push(member_id);
  }

  sql += ' ORDER BY b.category ASC';

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * 根据 ID 获取单个预算
 * @param {number} id 预算 ID
 * @returns {Object|undefined} 预算信息
 */
function getBudgetById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT 
      b.id, b.book_id, b.member_id, b.direction, b.category, 
      b.amount, b.period, b.date,
      m.name as member_name
    FROM budgets b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE b.id = ?
  `);
  return stmt.get(id);
}

/**
 * 添加新预算
 * @param {Object} data 预算数据
 * @param {number} data.book_id 账本 ID
 * @param {number} [data.member_id] 成员 ID
 * @param {string} data.direction 类型：income/expense
 * @param {string} data.category 分类
 * @param {number} data.amount 金额
 * @param {string} data.period 周期 (monthly/yearly 等)
 * @param {string} data.date 生效日期
 * @returns {Object} 新增预算信息（包含 id）
 */
function addBudget(data) {
  const db = getDb();
  const { book_id, member_id = null, direction, category, amount, period, date } = data;

  const stmt = db.prepare(`
    INSERT INTO budgets (book_id, member_id, direction, category, amount, period, date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(book_id, member_id, direction, category, amount, period, date);

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

/**
 * 更新预算信息
 * @param {number} id 预算 ID
 * @param {Object} data 更新数据
 * @returns {Object} 更新结果
 */
function updateBudget(id, data) {
  const db = getDb();
  const { member_id, direction, category, amount, period, date } = data;

  const stmt = db.prepare(`
    UPDATE budgets 
    SET member_id = COALESCE(?, member_id),
        direction = COALESCE(?, direction),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        period = COALESCE(?, period),
        date = COALESCE(?, date)
    WHERE id = ?
  `);

  const result = stmt.run(member_id, direction, category, amount, period, date, id);

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
  const db = getDb();
  const stmt = db.prepare('DELETE FROM budgets WHERE id = ?');
  const result = stmt.run(id);

  return {
    success: result.changes > 0,
    changes: result.changes,
  };
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
  const db = getDb();
  const { startDate, endDate } = options;

  // 获取所有预算
  const budgets = listBudgets(bookId);

  // 获取实际支出/收入
  let sql = `
    SELECT category, direction, SUM(amount) as actual
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

  sql += ' GROUP BY category, direction';

  const stmt = db.prepare(sql);
  const actuals = stmt.all(...params);

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

