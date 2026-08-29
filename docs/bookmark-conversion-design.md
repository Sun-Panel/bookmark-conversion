# 书签转换微应用 - 需求与设计文档

> 目标：将浏览器导出的 HTML 书签文件，转换为 Sun Panel v2 可导入的配置文件（`config.json` + 图标目录），并打包为 ZIP 下载。
> 全部功能在浏览器端（微应用页面）实现，无后端依赖。

---

## 一、需求概述

微应用只有一个主页面，页面上有 3 个按钮：

| 按钮 | 功能 |
| --- | --- |
| 1. 导入 HTML 书签 | 上传浏览器导出的 HTML 书签文件（Netscape 格式） |
| 2. 开始转换 | 解析书签，转换为 Sun Panel v2 配置结构，展示为**可勾选的树形菜单** |
| 3. 导出配置文件 | 将勾选的项目打包为 `SunPanel-Config-xxx.zip` 下载（内含 `config.json` + `icon-images/` 目录） |

### 已知示例文件情况（`favorites_2026_8_29.html`）

- 总链接数：941 个
- 顶层文件夹：4 个（`收藏夹栏`、`常用`、`QQ`、`阅读列表保存`）
- `收藏夹栏` 是浏览器工具栏容器（`PERSONAL_TOOLBAR_FOLDER="true"`），内含 9 个二级文件夹（教程、文档、在线工具/应用、我的、电影、临时、收藏的、公司、稍后阅读）
- 带图标的链接：202 个，**全部是 `data:image/png;base64,...` 格式**
- 无图标链接：739 个

---

## 二、技术可行性分析

### 1. HTML 书签解析 — 可行

- 浏览器 `DOMParser`（`text/html` 模式）即可解析 Netscape 书签 HTML
- 书签结构：`DL > DT > H3`（文件夹）或 `A`（链接），文件夹后面跟随嵌套 `DL`，用递归遍历即可还原任意层级

### 2. 多层级 → 一级分组转换 — 可行

Sun Panel 只支持 `icons: [{ title, items }]` 一级分组。本微应用提供**两套分组方案，导出时由用户选择**：

- **方案A「顶层分组」**：仅 HTML 顶层文件夹作为分组；所有层级的链接全部平铺到其所属的顶层分组；无文件夹包裹的链接归入"默认"分组
- **方案B「全量文件夹分组」（最小化分组）**：所有层级（含非顶层）的文件夹都提升为一级分组，链接归属其**直接父文件夹**分组；无文件夹包裹的链接归入"默认"分组。分组数量最多、每组内容最小

> 示例：`教程 > 硬件 > 链接x`
> - 方案A：分组只有 `教程`，`链接x` 平铺进 `教程`
> - 方案B：`教程`、`硬件` 各自成为分组，`链接x` 放在 `硬件` 分组

### 3. 图标处理 — **完全可行（本示例）**

对示例文件检查结果：所有 202 个图标均为 `data:image/png;base64,...`。

| 图标来源 | 处理方式 | 可行性 |
| --- | --- | --- |
| `data:image/png;base64,...`（本示例全部） | 直接解码 base64 → Blob → 保存为 `icon-images/<hash>.png` | **100% 可行**，无需网络、无跨域问题 |
| 无图标（739 个） | **尽力下载 favicon**：用 `<img>` 标签（`crossOrigin="anonymous"`）探测 `https://<域名>/favicon.ico`，加载成功且 canvas 可读取则转存为图片文件；被 CORS 污染或加载失败则退回**文字图标**（type=1） | 部分可行（遵循微应用规范，不用 fetch，改用 Image+canvas 探测；成功率取决于站点是否返回 CORS 头） |
| `http(s)://...` URL 图标（其他书签文件可能） | 同样用 `<img>` 探测，成功则转存文件；失败则保留 URL 作为 `icon.src`（type=2） | 部分可行（受 CORS 限制） |

> 结论：**图标可以直接保存为图片文件**。base64 图标 100% 转文件；favicon/URL 图标尽力而为（Image+canvas 探测，不违反微应用网络规范）；无图标用文字图标兜底。

### 4. ZIP 打包 — 可行

- 浏览器端使用 **JSZip** 库（vite 可直接打包进微应用）
- 生成 `config.json` + `icon-images/` 目录后整体压缩为 ZIP

### 5. config.json 生成 — 可行（完全对齐 Sun Panel 官方格式）

参考 Sun Panel 官方 `shareV2.ts` 导出逻辑，格式如下（含 `md5` 校验值算法）：

```json
{
  "name": "Sun-Panel-Config",
  "version": "2.0",
  "exportTime": "2026-08-29 10:44:35",
  "appVersion": "",
  "md5": "8位hex（simpleHash(JSON.stringify(icons))）",
  "funcConfig": { "iconImagesPath": "icon-images" },
  "icons": [ ... ]
}
```

`md5` 算法（官方源码一致）：

```js
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
```

---

## 三、转换规则详述

### 1. 分组结构（icons）— 两套方案

**方案A「顶层分组」**（字面，分组少、每组大）：

```
HTML 书签结构                     →  SP config.json 结构
─────────────────────────────────────────────────────────────
(顶层文件夹A)                      →  { title: "A", sort: 0, items: [...] }
  ├── 文件夹A1                    →      └── 仅平铺链接，文件夹不生成分组
  │     └── 链接a1、a2             →          items 中包含 a1、a2
  ├── 文件夹A2
  │     └── 文件夹A3
  │           └── 链接a3           →          items 中包含 a3（跨层级平铺）
  └── 直接链接 a4                  →          items 中包含 a4
```

**方案B「全量文件夹分组」**（最小化，分组多、每组小）：

```
HTML 书签结构                     →  SP config.json 结构
─────────────────────────────────────────────────────────────
(顶层文件夹A)                      →  { title: "A", sort: 0, items: [直接链接a4] }
  ├── 文件夹A1                    →  { title: "A1", sort: 1, items: [a1, a2] }
  │     └── 链接a1、a2            
  ├── 文件夹A2                    →  { title: "A2", sort: 2, items: [] }
  │     └── 文件夹A3              →  { title: "A3", sort: 3, items: [a3] }
  │           └── 链接a3          
  └── 直接链接 a4                 →  （归入 A 分组）
（无文件夹包裹的根级链接）          →  { title: "默认", sort: 9, items: [...] }
```

> 两套方案在**导出时弹出选择框**由用户决定；转换后的树形菜单始终展示**原始层级结构**，方便精确勾选。

### 2. 链接条目（item）

```json
{
  "title": "书签标题",
  "sort": 0,
  "background": "",
  "cardData": {
    "icon": { "src": "icon-images/xxx.png", "text": "", "type": 2 },
    "openMethod": 2,
    "url": "https://example.com/",
    "lanUrl": "",
    "customUrls": [],
    "textColor": ""
  },
  "cardDataPrivate": { "remarks": "" },
  "cardSize": 2,
  "showTitle": true
}
```

字段取值规则：

| 字段 | 取值 | 说明 |
| --- | --- | --- |
| `icon.type` | `1`=文字 / `2`=图片 / `3`=图标库 | 有 base64 图标→`2`（src 指向 icon-images 文件）；无图标→`1`（text 为首字符）；URL 图标下载失败→`2`（src 保留 URL） |
| `icon.src` | 本地文件路径或 URL | 图标已转文件时使用 `icon-images/<hash>.png` |
| `icon.text` | 文字图标内容 | 无图标时取标题首字符（或域名首字母） |
| `openMethod` | `2` | 新窗口打开 |
| `cardSize` | `2` | 默认中等卡片 |
| `showTitle` | `true` | 书签需要显示标题 |
| `sort` | 组内递增序号 | 保持书签原有顺序 |

### 3. 图标文件命名

- 文件名为内容 MD5（32 位 hex），如 `8f3d2a1c5b7e9d4f00a1b2c3d4e5f607.png`
- 扩展名根据 base64 的 MIME 类型：`image/png`→`.png`、`image/svg+xml`→`.svg`、`image/x-icon`→`.ico` 等
- 相同内容的图标自动去重（同名覆盖）

### 4. 导出文件

- 目录结构：`SunPanel-Config-YYYYMMDDHHmm.zip`（或用户勾选后固定名）
  ```
  └── SunPanel-Config/
      ├── config.json
      └── icon-images/
          ├── xxxxx.png
          └── ...
  ```
- `exportTime` 取导出时刻，格式 `YYYY-MM-DD HH:mm:ss`

---

## 四、转换示例（真实数据）

### 输入：书签 HTML 片段

```html
<DT><H3>教程</H3>
<DL><p>
  <DT><H3>硬件</H3>
  <DL><p>
    <DT><A HREF="http://timor.tech/mcu/" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...">硬件-提莫的神秘商店</A>
    <DT><A HREF="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/">ESP-IDF 编程指南</A>
  </DL><p>
  <DT><H3>CSS</H3>
  <DL><p>
    <DT><A HREF="https://developer.mozilla.org/zh-CN/docs/Web/CSS" ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...">MDN CSS 参考</A>
  </DL><p>
  <DT><A HREF="https://www.runoob.com/">菜鸟教程</A>
</DL><p>
```

### 输出：SP 分组"教程"（跨层级平铺）

```json
{
  "title": "教程",
  "sort": 0,
  "items": [
    {
      "title": "硬件-提莫的神秘商店",
      "sort": 0,
      "background": "",
      "cardData": {
        "icon": { "src": "icon-images/8f3d2a1c5b7e9d4f00a1b2c3d4e5f607.png", "text": "", "type": 2 },
        "openMethod": 2,
        "url": "http://timor.tech/mcu/",
        "lanUrl": "",
        "customUrls": [],
        "textColor": ""
      },
      "cardDataPrivate": { "remarks": "" },
      "cardSize": 2,
      "showTitle": true
    },
    {
      "title": "ESP-IDF 编程指南",
      "sort": 1,
      "background": "",
      "cardData": {
        "icon": { "src": "", "text": "E", "type": 1 },
        "openMethod": 2,
        "url": "https://docs.espressif.com/projects/esp-idf/zh_CN/latest/",
        "lanUrl": "",
        "customUrls": [],
        "textColor": ""
      },
      "cardDataPrivate": { "remarks": "" },
      "cardSize": 2,
      "showTitle": true
    },
    {
      "title": "MDN CSS 参考",
      "sort": 2,
      "background": "",
      "cardData": {
        "icon": { "src": "icon-images/7a1b9c2d3e4f5a6b7c8d9e0f1a2b3c4d.png", "text": "", "type": 2 },
        "openMethod": 2,
        "url": "https://developer.mozilla.org/zh-CN/docs/Web/CSS",
        "lanUrl": "",
        "customUrls": [],
        "textColor": ""
      },
      "cardDataPrivate": { "remarks": "" },
      "cardSize": 2,
      "showTitle": true
    },
    {
      "title": "菜鸟教程",
      "sort": 3,
      "background": "",
      "cardData": {
        "icon": { "src": "", "text": "菜", "type": 1 },
        "openMethod": 2,
        "url": "https://www.runoob.com/",
        "lanUrl": "",
        "customUrls": [],
        "textColor": ""
      },
      "cardDataPrivate": { "remarks": "" },
      "cardSize": 2,
      "showTitle": true
    }
  ]
}
```

> 说明：以上是**方案A（顶层分组）**的转换结果——"硬件"、"CSS" 子文件夹被拆散，其链接与"菜鸟教程"一起平铺到"教程"分组下。

> **方案B（全量文件夹分组）**则输出 3 个分组：`教程`（仅含"菜鸟教程"）、`硬件`（含"硬件-提莫的神秘商店"、"ESP-IDF 编程指南"）、`CSS`（含"MDN CSS 参考"）。

### 完整 config.json 骨架

```json
{
  "name": "Sun-Panel-Config",
  "version": "2.0",
  "exportTime": "2026-08-29 15:30:00",
  "appVersion": "",
  "md5": "a1b2c3d4",
  "funcConfig": { "iconImagesPath": "icon-images" },
  "icons": [
    { "title": "教程", "sort": 0, "items": [ ... ] },
    { "title": "文档", "sort": 1, "items": [ ... ] },
    { "title": "默认", "sort": 9, "items": [ ... ] }
  ]
}
```

---

## 五、页面设计（微应用主页面）

```
┌─────────────────────────────────────────────┐
│  📌 书签转换工具                              │
│  将浏览器书签转换为 Sun-Panel v2 配置文件       │
├─────────────────────────────────────────────┤
│  [按钮1 导入HTML书签文件]  已选择: xx.html      │
│  [按钮2 开始转换]                             │
│                                             │
│  转换结果统计：4 个分组 / 941 个链接 / 202 个图标 │
│  (favicon 下载中: 12/739 ...)                │
│  ┌ 教程           [全选]  (可折叠)           │
│  │  ┌ 硬件         [全选]                   │
│  │  │  ☑ 硬件-提莫的神秘商店                  │
│  │  │  ☐ ESP-IDF 编程指南                    │
│  │  └ CSS                                   │
│  └ 文档                                       │
│  ☑ 全部选中 / 清空                            │
│  [按钮3 导出配置文件 x.zip]                   │
└─────────────────────────────────────────────┘
```

交互流程：

1. **导入**：点击选择本地 HTML 书签文件，读取文件内容（`FileReader`）
2. **转换**：`DOMParser` 解析 → 构建原始层级树 → 提取 base64 图标 → 展示可勾选树形菜单
3. **favicon 下载（异步，自动开始）**：对无图标链接并发探测 `https://<域名>/favicon.ico`（`<img crossorigin="anonymous">` + canvas），成功则转存图标文件并刷新树形菜单；失败自动退回文字图标。UI 显示下载进度，**不阻塞**用户勾选/导出
4. **勾选**：支持文件夹级全选/取消、链接级勾选、全部选中/清空；统计显示选中数
5. **去重（可选按钮）**：用户可点击"去重"按钮，移除 URL+标题完全相同的重复链接（默认不自动去重）
6. **导出**：点击按钮3 → 弹出**方案选择框**（方案A 顶层分组 / 方案B 全量文件夹分组）→ 按所选方案把勾选项重组为 `config.json`（重新计算 md5）→ 图标只打包勾选链接用到的文件 → JSZip 压缩为 `SunPanel-Config-YYYYMMDDHHmm.zip` → 触发下载

---

## 六、技术栈

| 项 | 选型 | 说明 |
| --- | --- | --- |
| 页面组件 | `SunPanelPageElement`（Lit） | 继承 SDK 基类，自动 i18n / 资源路径 |
| HTML 解析 | `DOMParser` | 浏览器原生 |
| base64 解码 | `atob` + `Uint8Array` | 浏览器原生 |
| 图标命名 | 自实现 MD5（32 位 hex） | 内容去重命名 |
| favicon 探测 | `<img crossorigin>` + canvas | 浏览器原生，不违反微应用网络规范（不用 fetch） |
| ZIP | `JSZip`（npm 依赖） | 浏览器端打包 |
| 文件下载 | Blob + `<a download>` | 浏览器原生 |

---

## 七、已确认决策

1. **分组策略**：提供**两套方案，导出时由用户选择**——方案A「顶层分组」（仅顶层文件夹为分组）、方案B「全量文件夹分组」（所有层级文件夹都提升为分组）
2. **无图标链接**：**尽力下载 favicon**（`<img>`+canvas 探测，受 CORS 限制），失败退回文字图标
3. **导出文件名**：`SunPanel-Config-YYYYMMDDHHmm.zip`（官方风格）
4. **showTitle / cardSize**：默认 `showTitle: true`、`cardSize: 2`
5. **favicon 下载时机**：转换完成后**自动后台并发下载**（限并发、显示进度），不阻塞勾选/导出
6. **特殊协议过滤**：自动过滤 `javascript:`、`about:`、`chrome://`、`data:`、`file:` 等非网页链接
7. **文字图标样式**：标题首字符 + 按标题 hash 从固定调色板选背景色
8. **重复链接**：默认**保留**，提供"去重"按钮供用户手动移除 URL+标题完全相同的重复项

---

## 八、当前示例文件转换预期结果（方案A 顶层分组）

| 分组 | 来源 | 大致链接数 |
| --- | --- | --- |
| 教程 | 收藏夹栏/教程 及子层 | ~600 |
| 文档 | 收藏夹栏/文档 及子层 | ~100 |
| 在线工具/应用 | 收藏夹栏/在线工具/应用 | ~100 |
| 我的 | 收藏夹栏/我的 | ~60 |
| 电影 / 临时 / 收藏的 / 公司 / 稍后阅读 | 收藏夹栏下对应文件夹 | 各若干 |
| 常用 / QQ / 阅读列表保存 | 顶层独立文件夹 | 13 / 2 / 若干 |
| 默认 | 无文件夹包裹的根级链接 | 0~2 |

> 注：以上为估算，具体以实际解析结果为准。
