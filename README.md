# Sun-Panel 演示微应用 Hello World 项目

本项目为[Sun-Panel](https://sun-panel.top) V2 微应用开发模板。您可以基于本项目在您的 Github 仓库中 [**「快速创建一个微应用项目」**](https://github.com/new?template_name=microapp-hello-world&template_owner=Sun-Panel),
来快速开发你的微应用。或者你想要一个更完整的示例，请参考[微应用完整能力演示](https://github.com/Sun-Panel/All-In-One-demo)项目。

> **💡 提示**
> 
> 前期功能更新比较频繁请时刻关注微应用开发微信群里的最新动态，并保持使用该模板的最新版本并且 Sun-Panel 也要是最新版本！

开发请添加作者微信（95302870），备注：微应用，作者拉开发者群，微应用框架任何新动态，会统一公告。并更好的沟通，互相学习.

## 官方文档
请参考：https://doc.sun-panel.top/v2/zh_cn/micro_app_dev/

## 快速开始

本指南将帮助你在 5 分钟内跑通 Hello World 微应用。

前置要求需要安装 Node.js >= 18.20

### 步骤 1：克隆项目

从 GitHub 克隆项目模板：

```bash
git clone https://github.com/Sun-Panel/microapp-hello-world.git
cd microapp-hello-world
```


### 步骤 2：安装依赖 {#bundle_install}

```bash
npm install
```


### 步骤 3：启动开发服务器 {#start_dev_server}

```bash
npm run dev
```

启动成功后，会自动打开一个网页，按照提示复制入口文件地址，在 Sun-Panel 中导入，即预览微应用。


### 步骤 4：打包发布

```bash
npm run build   # 构建生产版本
npm run pack    # 打包组件包
```

打包产物位于 `packages/` 目录，生成 `.zip` 文件可直接上传到 [Sun-Panel 应用商店](https://appstore.sun-panel.top/)。

### 目录结构说明

#### 整体结构概览
```text
microapp-hello-world/
├── config/                          # 🔧 用户配置目录（需要修改）
├── locales/                         # 🌐 国际化资源目录（需要修改）
├── src/
│   ├── components/                  # 🧩 用户组件目录（需要修改）
│   ├── main.js                      # ⚙️ 入口文件（不要修改）
│   └── vite-env.d.ts                # ⚙️ TypeScript 类型定义（不要修改）
├── public/                          # 📁 静态资源（不要修改）
├── build/                           # 🏗️ 构建脚本（不要修改）
├── scripts/                         # 🔨 工具脚本（不要修改）
└── ...（其他配置文件）
```

#### 文件分类说明

| 文件/目录 | 类型 | 说明 | 是否需要修改 |
|-----------|------|------|:---:|
| `config/app.config.js` | **用户配置** | 应用基础配置（应用ID、版本、权限等） | ✅ 是 |
| `config/components.config.js` | **用户配置** | 组件注册配置（页面和组件定义） | ✅ 是 |
| `locales/zh-CN.js` | **用户资源** | 中文语言包 | ✅ 是 |
| `locales/en-US.js` | **用户资源** | 英文语言包 | ✅ 是 |
| `src/components/widget.js` | **用户组件** | 小部件组件（卡片主体） | ✅ 是 |
| `src/components/widgetConfig.js` | **用户组件** | 配置页面组件 | ✅ 是 |
| `src/main.js` | **框架入口** | 微应用入口文件（框架胶水代码） | ❌ 不要修改 |
| `src/vite-env.d.ts` | **框架定义** | TypeScript 类型定义 | ❌ 不要修改 |
| `public/*` | **静态资源** | 应用图标、Logo等 | ❌ 不要修改 |
| `build/*` | **构建脚本** | 构建和打包脚本 | ❌ 不要修改 |
| `scripts/*` | **工具脚本** | 模板更新等脚本 | ❌ 不要修改 |

#### 详细目录树
```text
microapp-hello-world/
├── config/                          # 🔧 用户配置目录
│   ├── app.config.js               # 应用主配置（应用信息、权限、数据节点等）
│   └── components.config.js        # 组件配置（页面和组件注册）
├── src/                            # 源码目录
│   ├── components/                 # 🧩 用户组件文件
│   │   ├── widget.js              # 小部件组件（卡片主体，基于 Lit）
│   │   └── widgetConfig.js        # 配置页面组件（基于 Lit）
│   ├── main.js                    # ⚙️ 入口文件（微应用开发无需关注，不要修改）
│   └── vite-env.d.ts              # ⚙️ TypeScript 类型定义（不要修改）
├── locales/                        # 🌐 国际化资源目录
│   ├── en-US.js                   # 英文语言包
│   ├── zh-CN.js                   # 中文语言包
│   └── ...
├── public/                         # 📁 静态资源目录（所有直接打包到根目录）
│   ├── icon.png                   # 应用图标
│   └── sun-panel-logo.png         # Sun Panel Logo
├── build/                          # ⚙️ 构建脚本目录（不要修改）
├── scripts/                        # ⚙️ 工具脚本目录（不要修改）
│   └── update-template.mjs        # 模板更新脚本
├── dist/                           # 📦 构建输出目录（自动生成）
├── packages/                       # 📦 打包输出目录（.zip 文件）
├── app.json                        # ⚙️ 自动生成的应用配置（不要修改）
├── package.json                    # ⚙️ 项目依赖配置（不要修改）
├── package-lock.json               # ⚙️ 依赖版本锁定文件（不要修改）
├── index.html                      # ⚙️ HTML 入口文件（不要修改）
├── eslint.config.js                # ⚙️ ESLint 配置（不要修改）
├── jsconfig.json                   # ⚙️ JavaScript 项目配置（不要修改）
├── README.md                       # 📝 项目说明（可自行修改）
└── vite.config.js                  # ⚙️ Vite 构建配置（不要修改）
```

> **💡 注意**
> 
> 国际化（i18n）和静态资源路径（getAssetPath）等功能已迁移至 `@sun-panel/micro-app` SDK。
> 框架入口文件 `src/main.js` 已自动集成 SDK 初始化，微应用开发无需手动处理。
> 组件中直接使用 `this.t()` 和 `this.getAssetPath()` 即可。

### 组件开发说明

本模板基于 **Lit** Web Components 和 `@sun-panel/micro-app` SDK 开发。

#### 小部件组件（widget.js）
小部件组件继承自 `SunPanelWidgetElement` 基类，需要实现以下方法：

| 方法 | 说明 |
|------|------|
| `onInitialized()` | 组件初始化时调用 |
| `onWidgetInfoChanged(newInfo, oldInfo)` | 小部件配置变更时调用 |
| `render1x1()` / `render2x2()` 等 | 不同尺寸的渲染方法 |
| `render()` | 主渲染方法（可选） |

可用的基类方法：
- `this.t(key)` — 国际化翻译
- `this.getAssetPath(path)` — 获取静态资源路径
- `this.spCtx` — 获取宿主平台上下文（darkMode、widgetInfo 等）

#### 配置页面组件（widgetConfig.js）
配置页面组件继承自 `SunPanelPageElement` 基类，需要实现以下方法：

| 方法 | 说明 |
|------|------|
| `onInitialized({ widgetInfo, customParam })` | 页面初始化时调用 |
| `handleSaveOrCreateWidget()` | 保存或创建小部件 |
| `getTitle()` | 返回页面标题 |
| `getButtonTitle()` | 返回按钮文字 |
| `render()` | 渲染配置表单 |

#### 添加新的语言
1. 在 `locales/` 目录下创建新的 `.js` 文件（如 `zh-TW.js`）
2. 在 `config/app.config.js` 的 `locales` 字段中注册
3. 组件中通过 `this.t('KEY')` 使用翻译

#### 添加新的静态资源
将资源文件放入 `public/` 目录，在组件中通过 `this.getAssetPath('/文件名')` 引用。

### 升级模板


#### 新版本一键升级
请尽量保持使用最新的模板底层框架，一键升级模板请执行，此命令不会覆盖掉已修改的代码：
```bash
npm run update
```
如果以上命令提示升级失败，请按照下面方式手动升级模版。

#### 旧版本手动升级
旧版本模板（`appJsonVersion:1.0`）手动覆盖更新。拉取最新模板代码，排除以下目录或者文件，其他代码直接你开发项目的旧代码。覆盖前请自行备份好代码文件。

排除的文件和目录：
- `src/components`
- `config/*`

更新后，将配置文件 `app.config.js` 内的`appJsonVersion` 改为 `1.1`。之后可以使用一键命令更新模板。


### 开发命令一览

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产模式构建 |
| `npm run build:dev` | 开发模式构建 |
| `npm run pack` | 打包组件包（生产模式） |
| `npm run pack:dev` | 打包组件包（开发模式） |
| `npm run update` | 更新模板 |
| `npm run update:force` | 强制更新模板 |