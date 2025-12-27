# 家庭记账本 (Family Ledger)

基于 Electron + SQLite 的跨平台桌面记账应用。

## 功能特性

- 📚 **多账本管理** - 支持创建多个独立账本
- 👨‍👩‍👧‍👦 **家庭成员** - 每个账本可添加多个成员
- 💰 **收支记录** - 完整的收入/支出记录管理
- 📊 **统计分析** - 汇总统计和分类统计
- 💵 **预算管理** - 设置预算并跟踪执行情况

## 技术栈

- Electron 28+
- Node.js
- SQLite (better-sqlite3)

## 安装

```bash
# 安装依赖
npm install

# 重新编译原生模块（如果需要）
npm run rebuild
```

## 运行

```bash
npm start
```

## 项目结构

```
familyLedger/
├── main.js                     # Electron 主进程入口
├── preload.js                  # 预加载脚本
├── package.json
├── renderer/
│   └── index.html              # 渲染进程页面
└── src/
    ├── database/
    │   ├── db.js               # 数据库初始化
    │   ├── books.js            # 账本 CRUD
    │   ├── members.js          # 成员 CRUD
    │   ├── records.js          # 账目 CRUD + 统计
    │   └── budgets.js          # 预算 CRUD
    └── ipc/
        └── handlers.js         # IPC 处理器注册
```

## 数据库表结构

### books (账本)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 账本名称 |
| description | TEXT | 描述 |
| created_at | DATETIME | 创建时间 |

### members (成员)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| book_id | INTEGER | 所属账本 ID |
| name | TEXT | 成员名称 |
| avatar | TEXT | 头像 URL |
| created_at | DATETIME | 创建时间 |

### records (账目)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| book_id | INTEGER | 所属账本 ID |
| member_id | INTEGER | 关联成员 ID |
| direction | TEXT | income/expense |
| category | TEXT | 分类 |
| amount | REAL | 金额 |
| date | TEXT | 日期 (YYYY-MM-DD) |
| note | TEXT | 备注 |
| created_at | DATETIME | 创建时间 |

### budgets (预算)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| book_id | INTEGER | 所属账本 ID |
| member_id | INTEGER | 关联成员 ID |
| direction | TEXT | income/expense |
| category | TEXT | 分类 |
| amount | REAL | 预算金额 |
| period | TEXT | 周期 (monthly/yearly) |
| date | TEXT | 生效日期 |

## API 接口

所有接口通过 `window.api` 访问，返回格式：

```javascript
{
  success: boolean,
  data?: any,      // 成功时返回数据
  error?: string   // 失败时返回错误信息
}
```

### 账本 (books)

```javascript
// 获取所有账本
await window.api.books.list()

// 添加账本
await window.api.books.add({ name: '家庭账本', description: '日常开支' })

// 更新账本
await window.api.books.update(1, { name: '新名称' })

// 删除账本
await window.api.books.delete(1)
```

### 成员 (members)

```javascript
// 获取成员列表
await window.api.members.list(bookId)

// 添加成员
await window.api.members.add({ book_id: 1, name: '爸爸', avatar: '' })

// 更新成员
await window.api.members.update(1, { name: '父亲' })

// 删除成员
await window.api.members.delete(1)
```

### 账目 (records)

```javascript
// 获取账目列表
await window.api.records.list(bookId, {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  direction: 'expense',
  category: '餐饮',
  member_id: 1,
  limit: 20,
  offset: 0
})

// 添加账目
await window.api.records.add({
  book_id: 1,
  member_id: 1,
  direction: 'expense',
  category: '餐饮',
  amount: 50.5,
  date: '2024-01-15',
  note: '午餐'
})

// 更新账目
await window.api.records.update(1, { amount: 60 })

// 删除账目
await window.api.records.delete(1)

// 获取汇总统计
await window.api.records.summary(bookId, {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
})
// 返回: { income: 10000, expense: 5000, balance: 5000 }

// 获取分类汇总
await window.api.records.categorySummary(bookId, {
  direction: 'expense',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
})
// 返回: [{ category: '餐饮', total: 2000, count: 50, percentage: 40 }, ...]
```

### 预算 (budgets)

```javascript
// 获取预算列表
await window.api.budgets.list(bookId, {
  direction: 'expense',
  period: 'monthly'
})

// 添加预算
await window.api.budgets.add({
  book_id: 1,
  direction: 'expense',
  category: '餐饮',
  amount: 3000,
  period: 'monthly',
  date: '2024-01-01'
})

// 更新预算
await window.api.budgets.update(1, { amount: 3500 })

// 删除预算
await window.api.budgets.delete(1)

// 获取预算执行情况
await window.api.budgets.execution(bookId, {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
// 返回带有 actual, remaining, percentage, isOverBudget 字段的预算列表
```

## 数据存储位置

数据库文件位于：`{userData}/family_account.db`

- macOS: `~/Library/Application Support/family-ledger/family_account.db`
- Windows: `%APPDATA%/family-ledger/family_account.db`
- Linux: `~/.config/family-ledger/family_account.db`

## License

MIT

