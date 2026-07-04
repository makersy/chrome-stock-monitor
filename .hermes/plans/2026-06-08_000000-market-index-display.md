# 市场指数信息显示 — 设计方案（v4）

> 名称与两行数字纵向对齐，指数作为一个整体单元，竖线分隔。

## 1. 目标布局

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🇨🇳 3] [🇭🇰 2] [🇺🇸 1]   上证 3961.95  │  深成 14857.56     [⚙] │
│                                -1.63%  │      -2.98%              │
└──────────────────────────────────────────────────────────────────────┘
```

每个指数是一个**横向单元**（flex row）：名称在左 + 两行数字在右。

```
         ┌─ 3961.95  ← price (11px bold)
上证 ───┤
         └─ -1.63%   ← change (10px bold + 色底胶囊)
```

名称垂直居中于两行数字的高度，作为一个整体。两个指数之间用竖线分隔。

## 2. HTML 结构

```html
<!-- 上证 -->
<span class="index-item">
  <span class="idx-name">上证</span>
  <span class="idx-nums">
    <span class="idx-price up">3961.95</span>
    <span class="idx-change up">-1.63%</span>
  </span>
</span>

<!-- 分隔 -->
<span class="index-divider"></span>

<!-- 深成 -->
<span class="index-item">
  <span class="idx-name">深成</span>
  <span class="idx-nums">
    <span class="idx-price down">14857.56</span>
    <span class="idx-change down">-2.98%</span>
  </span>
</span>
```

DOM 树：
```
.index-group
  ├─ .index-item
  │   ├─ .idx-name       "上证"
  │   └─ .idx-nums       ← flex column
  │       ├─ .idx-price   "3961.95"
  │       └─ .idx-change  "-1.63%"
  ├─ .index-divider      ← 竖线
  └─ .index-item
      ├─ .idx-name       "深成"
      └─ .idx-nums
          ├─ .idx-price   "14857.56"
          └─ .idx-change  "-2.98%"
```

## 3. CSS

```css
/* ── 容器 ── */
.control-row {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 6px;
}

.control-left {
  display: flex; align-items: flex-start; gap: 6px;
  min-width: 0;
}

.index-group {
  display: flex; align-items: flex-start; gap: 0;
  margin-left: 2px;
  padding-top: 2px;
  font-variant-numeric: tabular-nums;
}

/* ── 单个指数单元：横向，名称垂直居中 ── */
.index-item {
  display: flex; align-items: center; gap: 3px;
}

/* ── 两行数字，纵向 ── */
.idx-nums {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 1px;
}

/* ── 名称：居中于两行数字高度 ── */
.idx-name {
  font-size: 10px; color: var(--ink-soft);
  font-weight: 500; line-height: 1;
}

/* ── 数字 ── */
.idx-price {
  font-size: 11px; font-weight: 700; line-height: 1.2;
}

.idx-change {
  font-size: 10px; font-weight: 600; line-height: 1;
  padding: 1px 4px; border-radius: 3px;
}

/* ── 颜色 ── */
.idx-price.up,   .idx-change.up   { color: #d03b2e; }
.idx-price.down, .idx-change.down { color: #0a8b5c; }
.idx-price.flat, .idx-change.flat { color: #7a8495; }

.idx-change.up   { background: rgba(208,59,46,0.10); }
.idx-change.down { background: rgba(10,139,92,0.10); }
.idx-change.flat { background: rgba(122,132,149,0.08); }

/* ── 分隔竖线 ── */
.index-divider {
  width: 1px;
  background: var(--line);
  margin: 0 7px;
  flex: 0 0 auto;
  align-self: stretch;
}
```

## 4. 对齐原理

```
                idx-nums (flex column, align-end)
                ┌──────────┐
  index-item    │ 3961.95  │ ← idx-price, right-aligned
  ┌───────────┐ │          │
  │ 上证       │ │ -1.63%   │ ← idx-change, right-aligned (under price)
  │(centered) │ └──────────┘
  └───────────┘
    idx-name      两行数字高度 ≈ 26px
    (10px)       名称在其中垂直居中
```

`index-item` 是 `flex + align-items: center` → 名称自动居中于右列数字的总高度。

涨跌幅右对齐（`align-items: flex-end` on idx-nums），数字的小数点通过 `tabular-nums` 对齐。

## 5. 加载/错误态

| 状态 | 显示 |
|------|------|
| 未加载 | `上证 --`（名称居中，price 位置放 `--`，无 change 行） |
| 出错 | `上证 !`（红色感叹号在 price 位置） |

## 6. 代码改动清单

| 文件 | 改动 |
|------|------|
| `config.js` | 新增 `MARKET_INDICES` |
| `i18n.js` | 新增 6 个 index 简称 |
| `market-service.js` | 新增 `parseIndexQuoteLine` + `fetchIndexQuotes`；`fetchQuotesForWatchlist` 返回 `indexQuotes` |
| `storage.js` | state 增加 `indexQuotes` |
| `popup.js` | `formatIndexPrice`、`renderIndexInfo`、修改 `renderControlRow`、`patchIndexInfo` |
| `popup.css` | 上述 CSS |
| `manifest.json` | 无需改动 |
