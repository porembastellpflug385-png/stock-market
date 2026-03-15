# Tracking System Data Model

## 1. 数据层目标

数据模型要支撑三件事：

1. 长期跟踪标的
2. 多策略模拟盘执行
3. AI 报告与后验结果验证

## 2. 推荐核心表

### 2.1 `watchlist_assets`

用途：
关注池主表

字段建议：

1. `id`
2. `symbol`
3. `name`
4. `asset_class`
5. `market`
6. `currency`
7. `status`
8. `added_at`
9. `added_reason`
10. `notes`

### 2.2 `watchlist_tags`

用途：
标的标签表

字段建议：

1. `id`
2. `asset_id`
3. `tag`
4. `created_at`

### 2.3 `market_snapshots_daily`

用途：
每日行情和指标快照

字段建议：

1. `id`
2. `asset_id`
3. `trade_date`
4. `close`
5. `change_pct`
6. `volume`
7. `market_cap`
8. `rsi14`
9. `macd`
10. `macd_signal`
11. `macd_histogram`
12. `ema20`
13. `ema50`
14. `atr14`
15. `support`
16. `resistance`
17. `signal_score`
18. `signal_label`

### 2.4 `ai_reports`

用途：
保存每次 AI 分析结果

字段建议：

1. `id`
2. `asset_id`
3. `report_date`
4. `report_type`
5. `source_model`
6. `summary`
7. `body_markdown`
8. `direction`
9. `confidence_score`
10. `action_recommendation`
11. `holding_horizon`
12. `support_level`
13. `resistance_level`
14. `target_price`
15. `stop_loss`
16. `created_at`

### 2.5 `strategy_profiles`

用途：
定义策略代理人

字段建议：

1. `id`
2. `name`
3. `style_type`
4. `description`
5. `rebalance_frequency`
6. `risk_budget`
7. `max_positions`
8. `status`
9. `config_json`

### 2.6 `paper_portfolios`

用途：
模拟盘组合主表

字段建议：

1. `id`
2. `strategy_profile_id`
3. `name`
4. `base_currency`
5. `initial_cash`
6. `current_cash`
7. `status`
8. `created_at`

### 2.7 `paper_positions`

用途：
模拟盘当前持仓

字段建议：

1. `id`
2. `portfolio_id`
3. `asset_id`
4. `quantity`
5. `avg_cost`
6. `market_price`
7. `market_value`
8. `weight`
9. `unrealized_pnl`
10. `updated_at`

### 2.8 `paper_trades`

用途：
模拟盘交易流水

字段建议：

1. `id`
2. `portfolio_id`
3. `asset_id`
4. `trade_date`
5. `side`
6. `quantity`
7. `price`
8. `amount`
9. `reason_type`
10. `reason_detail`
11. `linked_report_id`

### 2.9 `strategy_signals`

用途：
记录策略每日动作信号

字段建议：

1. `id`
2. `strategy_profile_id`
3. `asset_id`
4. `signal_date`
5. `signal_type`
6. `signal_strength`
7. `rationale`
8. `executed`
9. `linked_trade_id`

### 2.10 `validation_results`

用途：
验证 AI 结论的后验结果

字段建议：

1. `id`
2. `asset_id`
3. `report_id`
4. `validation_horizon`
5. `direction_correct`
6. `target_hit`
7. `support_effective`
8. `resistance_effective`
9. `recommendation_effective`
10. `strategy_alignment_score`
11. `actual_return_pct`
12. `validated_at`

### 2.11 `generated_reports`

用途：
保存日报、周报、月报和验证报告

字段建议：

1. `id`
2. `report_scope`
3. `report_period`
4. `title`
5. `body_markdown`
6. `body_html`
7. `pdf_url`
8. `created_at`

## 3. 关键关系

1. 一个 `watchlist_asset` 对应多个 `market_snapshots_daily`
2. 一个 `watchlist_asset` 对应多个 `ai_reports`
3. 一个 `strategy_profile` 对应一个或多个 `paper_portfolios`
4. 一个 `paper_portfolio` 对应多个 `paper_positions`
5. 一个 `paper_portfolio` 对应多个 `paper_trades`
6. 一个 `ai_report` 对应多个 `validation_results`

## 4. MVP 最小表集合

第一版可以先只建：

1. `watchlist_assets`
2. `market_snapshots_daily`
3. `ai_reports`
4. `strategy_profiles`
5. `paper_portfolios`
6. `paper_positions`
7. `paper_trades`
8. `validation_results`

## 5. 结构化输出要求

为了让验证体系成立，AI 报告不能只有自然语言。

每次分析至少要落结构化字段：

1. `direction`
2. `confidence_score`
3. `action_recommendation`
4. `holding_horizon`
5. `support_level`
6. `resistance_level`
7. `target_price`
8. `stop_loss`

## 6. 技术建议

如果后面进入实现，推荐：

1. `SQLite / Postgres` 存业务数据
2. `cron / 定时任务` 驱动日报、周报、月报
3. `JSONB / config_json` 保存策略参数
4. 所有报告保留 Markdown 原文，便于导出和回放
