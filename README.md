# Market Analyzer Pro

一个升级后的股票 / 加密货币实时分析工具，支持：

- 实时报价与历史走势
- 技术指标计算：`SMA20`、`EMA20`、`EMA50`、`RSI14`、`MACD`、`Bollinger Bands`、`ATR14`
- 多因子综合信号评分
- 用户自定义分析维度、风险偏好、观察周期
- 后端统一生成 AI 专业报告，避免前端暴露默认密钥
- 中文名称搜索的 AI 兜底解析
- 首页可配置第三方 `Base URL / API Key / Model`，并保存到本地

## 运行方式

1. 安装依赖

```bash
npm install
```

2. 可选：配置服务端默认环境变量 `.env.local` 或 `.env`

```bash
GEMINI_API_KEY=your_key_here
LLM_MODEL=gpt-4.1-mini
```

不配置也可以运行，系统会自动退化为规则引擎分析。
如果你在首页配置了第三方 `Base URL / API Key`，前端会优先使用你保存的第三方 OpenAI 兼容接口。

3. 启动开发环境

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 主要接口

- `GET /api/search/:query`：搜索资产，支持中文名称 AI 兜底
- `GET /api/quote/:ticker`：实时报价
- `GET /api/chart/:ticker`：历史 K 线
- `GET /api/asset/:ticker?timeframe=6mo`：报价 + 指标 + 时间序列
- `POST /api/analyze`：后端生成专业分析报告

## 升级重点

- 将 AI 调用迁移到服务端，避免浏览器暴露密钥
- 支持首页设置第三方 API，并保存在浏览器本地
- 抽离共享技术指标引擎，前后端复用
- 引入“综合信号评分 + 关键价位 + 风险提示”分析框架
- 新增前端配置面板，支持自定义分析维度和关注点
- 提供自动刷新，适合盯盘场景
