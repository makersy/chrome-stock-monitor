# Chrome Stock Monitor

**[English](./README_EN.md)** | 一个轻量级 Chrome 扩展，实时监控 A 股、港股、美股行情，支持自定义提醒。

> 纯前端 · 无后端 · Manifest V3 · 开箱即用

## 截图

Popup 界面为 380×560 紧凑卡片，顶部市场切换（🇨🇳 A 股 / 🇭🇰 港股 / 🇺🇸 美股），底部三栏行情 + 搜索 + 提醒。仅依赖公开行情接口，无需注册登录。

## 功能

### 行情查看

- 实时价格、涨跌额、涨跌幅、更新时间
- 红涨绿跌配色
- A 股 / 港股 / 美股三市场独立管理，tab 切换

### 股票搜索

- **A 股 / 港股**：优先走腾讯 `smartbox` 全市场远程检索 + 东方财富搜索接口，支持代码、名称、拼音、缩写
- **美股**：内置热门股票库，支持代码、英文名称、别名匹配
- 搜索结果自动写入 `chrome.storage.local` 缓存，同查询命中后不再重复请求
- 支持**按代码直接添加**：A 股 `600519`、港股 `00700`、美股 `AAPL`
- A 股北交所代码自动推断前缀（如 `830799` → `bj830799`）

### 行情刷新

- **手动刷新**：Popup 内一键刷新
- **自动刷新**：后台 offscreen document + setInterval 驱动，支持 **1–30 秒**任意整数间隔
- 自动刷新在 popup 关闭后继续运行

### 提醒系统

- **涨跌幅阈值**：设置涨跌幅百分比，超过阈值触发提醒
- **目标价**：设置目标价格和方向（`≥` / `≤`），达到触发提醒
- 提醒触发后在扩展图标上显示 badge 数字
- badge 标题自动更新为触发股票数量

### 设置

- 自动刷新开关
- 刷新频率（1–30 秒）
- 角标提醒总开关
- 涨跌幅提醒开关
- 目标价提醒开关

## 数据来源

| 接口 | 用途 |
|------|------|
| `qt.gtimg.cn` | A 股 / 港股 / 美股实时行情 |
| `smartbox.gtimg.cn` | A 股 / 港股股票搜索 |
| `searchapi.eastmoney.com` | A 股 / 港股 / 美股搜索（东方财富） |

所有数据均为公开接口，插件不收集、不上传任何用户数据。

## 安装

### 从源码加载

1. 克隆仓库：
   ```bash
   git clone https://github.com/makersy/chrome-stock-monitor.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目目录
5. 固定插件到工具栏

## 文件结构

```
chrome-stock-monitor/
├── manifest.json
├── popup.html
├── offscreen.html
├── styles/
│   └── popup.css
└── scripts/
    ├── popup.js              # Popup UI 渲染 + 交互
    ├── background.js          # Service Worker，调度刷新和 badge
    ├── config.js              # 市场配置、默认值、存储键名
    ├── storage.js             # chrome.storage.local 读写封装
    ├── alerts.js              # 提醒评估逻辑
    ├── offscreen-refresh.js   # Offscreen 定时刷新器
    ├── data/
    │   ├── search-provider.js # 股票搜索（腾讯 + 东方财富 + 缓存）
    │   └── stocks-data.js     # 内置热门股票库 + 本地搜索
    └── quotes/
        └── market-service.js  # 行情获取与解析
```

## 技术细节

- **Manifest V3**，使用 Service Worker + Offscreen Document
- 纯原生 HTML / CSS / JavaScript，无框架依赖
- 搜索缓存策略：内存 Map + `chrome.storage.local`，TTL 7 天，上限 180 条
- 行情解析：GBK 解码 → `v_hint` / `v_` 正则提取 → 字段映射
- 所有持久化使用 `chrome.storage.local`

## 限制

- 使用公开行情/搜索接口，稳定性和字段格式不受控制
- 无交易日历和交易时段判断，非交易时段显示上次数据
- 美股搜索依赖内置热门库，非全市场覆盖
- 提醒仅实现 badge，不含桌面通知、声音
- 无排序、分组、拖拽、自定义主题

## 许可

无特定许可证，自由使用。
