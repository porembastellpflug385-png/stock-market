# Market Analyzer Pro

当前版本：`v1.0`

一个面向股票、ETF、港股、A 股、加密资产的分析与跟踪工具。当前版本已经从单票分析扩展为 3 个主要工作台：

- `实时分析`
- `跟踪系统`
- `市场扫描`

## 当前能力

### 1. 实时分析

- 单票加载报价、历史走势、技术指标
- 技术指标：
  - `SMA20`
  - `EMA20`
  - `EMA50`
  - `RSI14`
  - `MACD`
  - `Bollinger Bands`
  - `ATR14`
- 综合信号评分、关键价位、趋势/动量/波动快照
- AI 专业报告导出：
  - `PDF`
  - `Markdown`
  - `HTML`

### 2. 跟踪系统

- 关注池管理
- 候选池管理
- 5 个策略代理人模拟盘：
  - 全球价值基金风格
  - 全球成长基金风格
  - 宏观对冲风格
  - 幻方量化风格
  - ETF 轮动风格
- 报告生成：
  - `日报`
  - `周报`
  - `月报`
- 运行模式：
  - `快速模式`：优先稳定生成报告
  - `完整模式`：更新模拟盘、交易、净值
- 执行频率设置：
  - `日频`
  - `手动频率`
- 运行日志
- AI 结论验证面板

### 3. 市场扫描

- 规则型市场扫描器
- AI 精筛候选
- 候选池承接扫描结果
- 结构化策略池
- A 股结构化全量扫描
- 实时看板：
  - 全市场样本
  - 预筛后样本
  - 命中数量
  - 扫描来源
  - 覆盖板块
  - 覆盖进度
- 命中结果会显示每只股票对应筛选条件的实际数值

## 当前默认模型策略

后端默认按“主模型 + 回退模型”运行：

- 主模型：`gpt-5.4`
- 回退模型：当前网关不可用时自动切到可用兼容模型

说明：

- 单票分析优先尝试 `gpt-5.4`
- 如果上游返回 `model_not_found`、`upstream_error`、`429` 等模型侧错误，系统会自动回退
- 因此页面上可能看到：
  - `AI 正常生成`
  - 或 `规则降级生成`
  - 或 `自动切换到可用模型`

## 当前市场扫描的结构化条件

市场扫描页目前支持以下结构化条件：

- 市场范围：
  - `美股`
  - `A股`
  - `港股`
  - `ETF`
  - `加密`
- 是否包含 `ST`
- 是否包含 `新股`
- 昨日收盘价：
  - 大于
  - 小于
- 日成交额：
  - 大于
  - 小于
- 近 20 日平均日内振幅：
  - 大于
  - 小于
- 近 60 日涨幅：
  - 排名前 `N`
- 当前股价站稳 `N` 日均线
- 近 `N` 日横盘
- 近 `N` 日最高价与最低价之差小于多少 `%`
- 今日成交量：
  - `上升`
  - `下浮`
  - `不限`

## A 股全量扫描说明

当前 A 股扫描不是只扫固定样本池，而是优先走 A 股全量快照链路。

当前实现：

- 主源：按板块独立分页抓取
  - 深市主板
  - 中小板
  - 创业板
  - 沪市主板
  - 科创板
- 备用源：主源样本偏少时自动补抓组合市场快照
- 合并去重
- 低样本保护：
  - 如果抓回样本异常偏少，不会写入缓存

页面会显示：

- `全市场样本`
- `预筛后样本`
- `覆盖进度`
- `覆盖板块`
- `实时抓取 / 缓存命中`

## 跟踪系统运行方式

### 手动按钮

- `生成日报 / 周报 / 月报`
  - 默认走 `fast` 模式
  - 优先稳定出报告
  - 不强制推动 5 个策略调仓

- `更新模拟盘（完整）`
  - 走 `full` 模式
  - 真正触发 5 个策略再平衡
  - 更新：
    - 持仓
    - 交易记录
    - 净值历史
    - 最近调仓时间

### 自动执行

当 `executionMode = daily` 且 Vercel cron 生效时，系统会按计划自动运行。

当 `executionMode = manual` 时：

- cron 会跳过
- 只有手动点击 `更新模拟盘（完整）` 才会推进模拟盘

## 运行方式

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

访问：

[http://localhost:3000](http://localhost:3000)

## 环境变量

可选环境变量示例：

```bash
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.4
CRON_SECRET=your_secure_secret
TRACKING_AI_MAX_ASSETS=6
```

说明：

- `OPENAI_*` 用于服务端默认模型调用
- `CRON_SECRET` 用于保护 cron 路由
- `TRACKING_AI_MAX_ASSETS` 用于限制跟踪系统每轮 AI 深度分析的重点标的数量

## 主要接口

### 分析相关

- `GET /api/search/:query`
- `GET /api/asset/:ticker?timeframe=6mo`
- `POST /api/analyze`

### 跟踪系统

- `GET /api/tracking/overview`
- `POST /api/tracking/run`
- `GET /api/tracking/cron/daily`
- `GET /api/tracking/cron/weekly`
- `GET /api/tracking/cron/monthly`

### 市场扫描

- `POST /api/scanner/run`
- `POST /api/scanner/refine`
- `POST /api/scanner/validate`

## Vercel 定时任务

项目已经内置跟踪系统定时入口。

在 Vercel 上建议配置：

```bash
CRON_SECRET=your_secure_secret
```

当前 `vercel.json` 已包含 cron 计划。  
函数时长配置放在：

- [/Users/kevin/Documents/code/market-analyzer-upgrade/api/[...route].ts](/Users/kevin/Documents/code/market-analyzer-upgrade/api/[...route].ts)

## 当前已知边界

- A 股“全量扫描”已经不再是固定核心样本池，但仍依赖外部行情源稳定性
- 如果上游短时异常，系统会优先：
  - 使用缓存
  - 回退备用源
  - 拒绝写入异常小样本
- 手动日报默认是快速模式，目的是优先稳定产出报告
- 前端包体积仍然较大，构建时会出现 `chunk size` 警告，但不影响运行

## 规划文档

- 产品方案：[tracking-system-prd.md](/Users/kevin/Documents/code/market-analyzer-upgrade/docs/tracking-system-prd.md)
- 数据结构：[tracking-system-data-model.md](/Users/kevin/Documents/code/market-analyzer-upgrade/docs/tracking-system-data-model.md)
- 页面与排期：[tracking-system-ia-and-roadmap.md](/Users/kevin/Documents/code/market-analyzer-upgrade/docs/tracking-system-ia-and-roadmap.md)
