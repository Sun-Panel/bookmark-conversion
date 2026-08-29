# appJsonVersion 1.0 升级到 1.1 指导文档

## 1. 版本差异概述

| 特性 | v1.0 | v1.1 |
|------|------|------|
| `appJsonVersion` | `"1.0"` 或无此字段 | `"1.1"` |
| 国际化方式 | `appInfo` 内直接写死文本 | `appInfo` 使用 `$t:KEY` 语法引用翻译 |
| 翻译文件 | 无 | 新增 `locales/` 目录，包含 `.js` 源文件和 `.json` 编译文件 |
| 构建流程 | 无 | 新增 `locales-generator.js` 编译翻译文件 |
| 小部件名称/描述 | 内嵌文本 | 支持 `$t:KEY` 语法引用翻译 |

## 2. 升级前准备

### 2.1 检查当前版本
查看项目根目录下的 `app.json` 文件，检查 `appJsonVersion` 字段：
```json
{
  "appJsonVersion": "1.0",
  ...
}
```
如果没有 `appJsonVersion` 字段，则默认为 v1.0。

### 2.2 备份项目
```bash
cp -r microapp-hello-world microapp-hello-world-backup
```

## 3. 升级步骤

### 步骤 1：修改 `config/app.config.js`

**文件路径**：`config/app.config.js`

#### 1a. 修改 `appJsonVersion`
```javascript
// 从
appJsonVersion: '1.0',
// 改为
appJsonVersion: '1.1',
```

#### 1b. 添加 `locales` 配置
在 `appInfo` 之后添加语言文件列表：
```javascript
// 语言文件映射（appJsonVersion:1.1 新增）
// 格式：{ 语言代码: 文件名 }，文件名相对于 locales/ 目录
// 支持多语言代码指向同一文件（如繁体中文共享简体中文文件）
locales: {
  'zh-CN': 'zh-CN.json',
  'en-US': 'en-US.json',
},
```

#### 1c. 修改 `appInfo` 使用 `$t:` 语法
将 `appInfo` 中的硬编码文本替换为 `$t:` 引用：
```javascript
// v1.0 写法
appInfo: {
  appName: 'Hello World',
  description: 'Sun-Panel 演示微应用',
  networkDescription: '无需链接任何三方网站',
},

// v1.1 写法
appInfo: {
  appName: '$t:APP_NAME',
  description: '$t:APP_DESCRIPTION',
  networkDescription: '$t:NETWORK_DESCRIPTION',
},
```

#### 完整的 v1.1 `app.config.js` 示例
```javascript
export default {
  appJsonVersion: '1.1',
  author: 'hslr',
  microAppId: 'hslr-hello-world',
  version: '1.1.0',
  entry: 'main.js',
  icon: 'logo.png',
  debug: true,

  // 应用信息（使用 '$t:KEY' 引用翻译）
  appInfo: {
    appName: '$t:APP_NAME',
    description: '$t:APP_DESCRIPTION',
    networkDescription: '$t:NETWORK_DESCRIPTION',
  },

  // 语言文件映射（appJsonVersion:1.1 新增）
  // 格式：{ 语言代码: 文件名 }，文件名相对于 locales/ 目录
  // 支持多语言代码指向同一文件（如繁体中文共享简体中文文件）
  locales: {
    'zh-CN': 'zh-CN.json',
    'en-US': 'en-US.json',
  },

  permissions: [],
  networkDomains: [],
  dataNodes: {},
};
```

### 步骤 2：创建翻译文件

#### 2a. 创建 `locales/` 目录
```bash
mkdir -p locales
```

#### 2b. 创建中文翻译文件 `locales/zh-CN.js`
```javascript
export default {
  APP_NAME: 'Hello World',
  APP_DESCRIPTION: 'Sun-Panel 演示微应用',
  NETWORK_DESCRIPTION: '无需链接任何三方网站',

  // 小部件信息（如果使用 $t: 引用）
  WIDGET_HELLO_NAME: '你好世界小部件',
  WIDGET_HELLO_DESCRIPTION: '这是一个演示小部件',

  // 带占位符的翻译
  GREETING: '你好, $1$!',

  // 通用文本
  SETTINGS: '设置',
  SAVE: '保存',
  CANCEL: '取消',
  CONFIRM: '确认',
};
```

#### 2c. 创建英文翻译文件 `locales/en-US.js`
```javascript
export default {
  APP_NAME: 'Hello World',
  APP_DESCRIPTION: 'Micro App Hello World',
  NETWORK_DESCRIPTION: 'No need to link to any third-party websites',

  // Widget information
  WIDGET_HELLO_NAME: 'Hello World Widget',
  WIDGET_HELLO_DESCRIPTION: 'A demo widget',

  // Translation with placeholders
  GREETING: 'Hello, $1$!',

  // Common text
  SETTINGS: 'Settings',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  CONFIRM: 'Confirm',
};
```

### 步骤 3：修改 `build/generators/app-json.js`

**文件路径**：`build/generators/app-json.js`

#### 3a. 在解构中添加 `locales`
找到 `extractComponentsMeta` 函数调用附近的解构赋值（约第 58 行），添加 `locales`：
```javascript
// v1.0
const { author, microAppId, version, entry, icon, i18n, appInfo, permissions, networkDomains, dataNodes } = appConfig;

// v1.1
const { appJsonVersion, author, microAppId, version, entry, icon, i18n, appInfo, permissions, networkDomains, dataNodes, locales } = appConfig;
```

#### 3b. 在 `appJson` 对象中添加 `locales` 字段
```javascript
const appJson = {
  appJsonVersion,  // 从 app.config.js 读取
  microAppId: finalMicroId,
  version,
  apiVersion: SP_API_VERSION,
  author,
  entry,
  icon,
  components: {},
  permissions,
  dataNodes,
  networkDomains,
  locales,
  debug,
  appInfo,
};
```

### 步骤 4：创建翻译文件编译脚本

**文件路径**：`build/generators/locales-generator.js`

如果项目中尚无此文件，需要创建。它负责将 `locales/` 下的 `.js` 文件编译为 `dist/locales/` 下的 `.json` 文件：

```javascript
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function compileLocales() {
  const localesDir = join(__dirname, '../../locales');
  const outputDir = join(__dirname, '../../dist/locales');

  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 检查 locales 目录是否存在
  if (!existsSync(localesDir)) {
    console.warn('⚠️  locales directory not found:', localesDir);
    return;
  }

  // 读取所有 .js 文件
  const files = readdirSync(localesDir).filter(file => file.endsWith('.js'));

  if (files.length === 0) {
    console.warn('⚠️  No .js files found in locales directory');
    return;
  }

  files.forEach(file => {
    const locale = file.replace('.js', '');
    const sourcePath = join(localesDir, file);

    try {
      const content = readFileSync(sourcePath, 'utf-8');

      // 移除 export default、注释并解析对象
      const cleanContent = content
        .replace(/export\s+default\s+/, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/;$/, '')
        .trim();

      const translations = new Function('return ' + cleanContent)();

      // 编译为 JSON
      const json = JSON.stringify(translations, null, 2);
      const outputPath = join(outputDir, `${locale}.json`);
      writeFileSync(outputPath, json, 'utf-8');

      console.log(`✅ Compiled ${file} -> ${locale}.json`);
    } catch (error) {
      console.error(`❌ Error compiling ${file}:`, error.message);
    }
  });
}
```

### 步骤 5：修改 `components.config.js`（如需小部件国际化）

**文件路径**：`config/components.config.js`

如果小部件的名称和描述也需要国际化，使用 `$t:` 语法：

```javascript
// v1.0
widgets: {
  'hello-world-widget': {
    // ...
    // 无 widgetName/widgetDescription
  }
}

// v1.1
widgets: {
  'hello-world-widget': {
    // ...
    widgetName: '$t:WIDGET_HELLO_NAME',
    widgetDescription: '$t:WIDGET_HELLO_DESCRIPTION',
    sort: 10,
  }
}
```

### 步骤 6：修改 `package.json` 构建脚本

**文件路径**：`package.json`

在 `scripts` 中添加翻译文件编译命令，并集成到构建流程：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:locales": "node build/generators/locales-generator.js"
  }
}
```

## 4. 构建打包流程

### 4.1 编译流程
```
locales/zh-CN.js  →  locales-generator.js  →  dist/locales/zh-CN.json
locales/en-US.js  →  locales-generator.js  →  dist/locales/en-US.json
```

### 4.2 打包命令
```bash
# 1. 编译翻译文件
npm run build:locales

# 2. 构建项目
npm run build
```

### 4.3 打包后的 zip 包结构
```
hslr-hello-world-1.1.0.zip
├── app.json                    # 应用配置（由 app-json.js 生成）
├── main.js                     # 主程序入口
├── locales/                    # 编译后的翻译文件
│   ├── zh-CN.json
│   └── en-US.json
├── logo.png                    # 图标
└── ...                         # 其他静态资源
```

**注意**：
- `app.json` 必须在 zip 根目录
- `dist/` 目录内容直接放到 zip 根目录
- 翻译文件放在 `locales/` 目录下
- 不要把语言文件压缩打包为 `assets/xxx.js`

## 5. 验证清单

### 5.1 配置文件验证
- [ ] `config/app.config.js` 中 `appJsonVersion` 已改为 `'1.1'`
- [ ] `config/app.config.js` 中已添加 `locales` 对象
- [ ] `config/app.config.js` 中 `appInfo` 使用 `$t:KEY` 语法
- [ ] `app.json` 中 `appJsonVersion` 已改为 `"1.1"`
- [ ] `app.json` 中已包含 `locales` 字段
- [ ] `app.json` 中 `appInfo` 使用 `$t:KEY` 语法

### 5.2 翻译文件验证
- [ ] `locales/zh-CN.js` 文件存在且格式正确
- [ ] `locales/en-US.js` 文件存在且格式正确
- [ ] 翻译键覆盖了所有 `$t:KEY` 引用
- [ ] 占位符格式正确（使用 `$1$` 到 `$9$`）

### 5.3 构建验证
- [ ] `npm run build:locales` 编译成功，`dist/locales/` 生成 `.json` 文件
- [ ] `npm run build` 构建成功
- [ ] 打包的 zip 包结构正确

### 5.4 运行验证
- [ ] 开发模式（`npm run dev`）能正常加载翻译
- [ ] 生产模式能从 `dist/locales/` 加载翻译
- [ ] 主平台能正确解析 v1.1 格式的 `app.json`
- [ ] 语言切换功能正常

## 6. 回滚方案

如果升级后出现问题，可以快速回滚到 v1.0：

```bash
# 1. 恢复配置文件
# 在 config/app.config.js 中：
#   appJsonVersion: '1.0',
#   移除 locales 字段
#   appInfo 中的 $t: 引用改回硬编码文本

# 2. 删除翻译文件（可选）
rm -rf locales

# 3. 恢复 app-json.js
# 移除 locales 相关代码
```

## 7. 常见问题

### Q1：升级后主平台无法识别应用？
**A**：检查 `app.json` 是否由 `app-json.js` 正确重新生成。运行 `node build/generators/app-json.js` 确认输出正确。

### Q2：翻译显示为 `$t:KEY` 原文？
**A**：检查以下几点：
1. `app.json` 中的 `locales` 字段是否正确
2. 翻译文件是否已编译到 `dist/locales/` 目录
3. 翻译键名是否与 `$t:` 引用完全一致（区分大小写）

### Q3：构建时报错 `locales directory not found`？
**A**：确保 `locales/` 目录已创建，且包含至少一个 `.js` 翻译文件。

### Q4：如何添加新的翻译语言？
1. 在 `locales/` 目录下创建新的语言文件（如 `locales/ja-JP.js`）
2. 在 `config/app.config.js` 的 `locales` 对象中添加对应映射
3. 运行 `npm run build:locales` 重新编译

### Q5：占位符如何使用？
在翻译文件中使用 `$1$` 到 `$9$` 表示动态参数：
```javascript
// 翻译文件
GREETING: '你好, $1$!',

// 代码中使用
t('GREETING', ['张三'])  // 输出: 你好, 张三!
```

## 8. 参考文件

| 文件 | 说明 |
|------|------|
| `config/app.config.js` | 应用配置（v1.1 源文件） |
| `app.json` | 生成的应用配置（v1.1 输出） |
| `locales/zh-CN.js` | 中文翻译源文件 |
| `locales/en-US.js` | 英文翻译源文件 |
| `dist/locales/*.json` | 编译后的翻译文件 |
| `build/generators/app-json.js` | app.json 生成器 |
| `build/generators/locales-generator.js` | 翻译文件编译器 |
| `config/components.config.js` | 组件配置（含小部件元数据） |
