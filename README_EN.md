# Chrome Stock Monitor

A lightweight Chrome extension for real-time A-share, HK, and US stock monitoring with custom alerts.

**[中文文档](./README.md)**

> Pure frontend · No backend · Manifest V3 · Ready to use

## Screenshot

The popup is a compact 380×560 card with market tabs (🇨🇳 A-Share / 🇭🇰 HK / 🇺🇸 US), live quotes, search, and alerts. Uses public data APIs — no registration or login required.

## Features

### Quote Monitoring

- Real-time price, change amount, change %, and update time
- Red-up / green-down color coding
- Three independent markets with tab switching

### Stock Search

- **A-Share / HK**: Tencent `smartbox` remote search + Eastmoney API. Supports stock code, name, pinyin, and abbreviation
- **US**: Built-in popular stock library with code, English name, and alias matching
- Search results cached in `chrome.storage.local` — no repeated requests for the same query
- **Direct code add**: A-Share `600519`, HK `00700`, US `AAPL`
- A-Share BSE (Beijing) code prefix auto-detection (e.g. `830799` → `bj830799`)

### Quote Refresh

- **Manual refresh**: One-click in the popup
- **Auto refresh**: Background offscreen document with setInterval — configurable from **1–30 seconds**
- Auto refresh continues running after the popup is closed

### Alert System

- **Change threshold**: Set a % threshold; alert triggers when exceeded
- **Target price**: Set a target price with direction (`≥` / `≤`); alert triggers on hit
- Triggered alerts show as a badge count on the extension icon
- Badge title auto-updates with the number of triggered stocks

### Settings

- Auto refresh toggle
- Refresh interval (1–30 seconds)
- Badge alerts master toggle
- Change threshold alerts toggle
- Target price alerts toggle

## Data Sources

| API | Purpose |
|-----|---------|
| `qt.gtimg.cn` | A-Share / HK / US real-time quotes |
| `smartbox.gtimg.cn` | A-Share / HK stock search |
| `searchapi.eastmoney.com` | A-Share / HK / US search (Eastmoney) |

All APIs are public. The extension does **not** collect or upload any user data.

## Installation

### Load from source

1. Clone the repository:
   ```bash
   git clone https://github.com/makersy/chrome-stock-monitor.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project directory
5. Pin the extension to the toolbar

## Project Structure

```
chrome-stock-monitor/
├── manifest.json
├── popup.html
├── offscreen.html
├── styles/
│   └── popup.css
└── scripts/
    ├── popup.js              # Popup UI rendering & interaction
    ├── background.js          # Service Worker — refresh scheduling & badge
    ├── config.js              # Market config, defaults, storage keys
    ├── storage.js             # chrome.storage.local read/write wrapper
    ├── alerts.js              # Alert evaluation logic
    ├── offscreen-refresh.js   # Offscreen document periodic refresher
    ├── data/
    │   ├── search-provider.js # Stock search (Tencent + Eastmoney + cache)
    │   └── stocks-data.js     # Built-in hot stock library & local search
    └── quotes/
        └── market-service.js  # Quote fetching & parsing
```

## Technical Notes

- **Manifest V3** with Service Worker + Offscreen Document
- Pure vanilla HTML / CSS / JavaScript — no framework dependencies
- Search cache: in-memory Map + `chrome.storage.local`, TTL 7 days, limit 180 entries
- Quote parsing: GBK decode → `v_hint` / `v_` regex extraction → field mapping
- All persistence via `chrome.storage.local`

## Limitations

- Relies on public quote/search APIs — stability and format are not under our control
- No trading calendar or session awareness — off-hours shows last-known data
- US search uses a built-in hot-stock library, not full market coverage
- Alerts are badge-only — no desktop notifications or sound
- No sorting, grouping, drag-and-drop, or custom themes

## License

No specific license. Use freely.
