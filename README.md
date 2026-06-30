# 实时订单数据分析系统

对接企业充电站后台订单系统，实现订单数据实时同步、存储、分析与可视化展示。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Node.js + Express + better-sqlite3 + Knex |
| 前端 | Vue 3 + Vant 4 + Pinia + ECharts + Vite |
| 定时 | node-cron |
| 日志 | Winston (console + 按日切割文件) |

## 快速开始

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 配置 .env（已包含默认值，可自行修改）
# 编辑 .env 文件，确认 API 地址和认证信息

# 3. 初始化数据库
npm run db:init

# 4. 启动开发环境（后端 :3000 + 前端 :5173）
npm run dev
```

启动后访问：
- **开发模式**：http://localhost:5173 （带 HMR 热更新）
- **生产预览**：http://localhost:3000 （Express 一体化服务）

## 项目结构

```
├── server/                  # 后端
│   ├── index.js             # Express 入口
│   ├── config.js            # 环境配置
│   ├── routes/              # API 路由
│   │   ├── auth.js          # 认证接口
│   │   ├── orders.js        # 订单查询
│   │   └── sync.js          # 同步管理
│   ├── services/            # 业务逻辑
│   │   ├── authService.js   # 登录 & Token 管理
│   │   ├── orderService.js  # 订单查询服务
│   │   └── syncService.js   # 数据同步服务
│   ├── db/                  # 数据库
│   │   ├── init.js          # 建表 & 初始化
│   │   └── queries.js       # SQL 查询
│   ├── middleware/
│   │   └── auth.js          # Token 验证中间件
│   └── utils/
│       ├── logger.js        # Winston 日志
│       ├── apiClient.js     # Axios + 重试
│       └── scheduler.js     # 定时任务
├── client/                  # 前端
│   └── src/
│       ├── pages/           # 页面组件
│       │   ├── Login.vue    # 登录
│       │   ├── Dashboard.vue# 数据看板
│       │   ├── OrderList.vue# 订单列表
│       │   └── SyncStatus.vue# 同步管理
│       ├── components/      # 子组件
│       ├── stores/          # Pinia 状态
│       ├── api/             # Axios 封装
│       └── router/          # 路由配置
├── .env                     # 环境变量
├── package.json             # 根脚本
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/status` | Token 状态 |
| GET | `/api/orders?page=1&size=20` | 订单列表 |
| GET | `/api/orders/stats` | 统计数据 |
| GET | `/api/sync/status` | 同步记录 |
| POST | `/api/sync/trigger` | 手动同步 |

## 功能特性

- ✅ 对接企业后台真实订单接口
- ✅ 每 30 分钟自动同步，支持手动触发
- ✅ 增量去重（order_id 唯一）
- ✅ Bearer Token 认证，自动刷新
- ✅ 请求失败自动重试（最多 3 次）
- ✅ 日志系统（console + 文件按日切割）
- ✅ 移动端优先响应式设计
- ✅ 数据可视化（ECharts 饼图 + 折线图）
- ✅ 预留 API 扩展层，方便后续微信小程序
