/**
 * app.json 生成器
 * 从 app.config.js 和 components.config.js 提取元数据自动生成 app.json 文件
 */

import appConfig from '../../config/app.config.js';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// 获取 @sun-panel/micro-app 包的版本号
const microAppEntryPath = require.resolve('@sun-panel/micro-app');
const microAppRoot = dirname(dirname(microAppEntryPath));
const SP_API_VERSION = JSON.parse(readFileSync(join(microAppRoot, 'package.json'), 'utf-8')).version;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 判断是否为开发环境
 * 根据打包命令的 NODE_ENV 来判断
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * 从 components.config.js 文件提取元数据（不导入组件）
 */
function extractComponentsMeta() {
  const componentsConfigPath = join(__dirname, '../../config/components.config.js');
  const content = readFileSync(componentsConfigPath, 'utf-8');
  
  // 移除 import 语句
  let code = content.replace(/import\s+.*?from\s+['"][\w\-/.@]+['"];\s*/g, '');
  
  // 移除 export default
  code = code.replace(/export\s+default\s+/, '');
  
  // 将所有 component: HomePage 等替换成 component: null
  code = code.replace(/component:\s*\w+/g, 'component: null');
  
  // 移除结尾的分号
  code = code.trim().replace(/;$/, '');
  
  // 使用 eval 安全地解析
  const componentsMeta = eval(`(${code})`);
  
  return componentsMeta;
}

/**
 * 生成 app.json 文件
 * 注意：组件名保持原样，标签名由主应用在注册时生成
 */
function generateAppJson() {
  const { appJsonVersion, author, microAppId, version, entry, icon, appInfo, permissions, networkDomains, dataNodes, locales, defaultLocale } = appConfig;
  const components = extractComponentsMeta();

  // dev 模式下自动添加 -dev 后缀
  const finalMicroId = isDev ? `${microAppId}-dev` : microAppId;

  // 构建 app.json 对象
  const appJson = {
    appJsonVersion: appJsonVersion || '1.0',
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
    appInfo,
    locales,
    defaultLocale
  };

  // 构建组件配置（保持原始组件名，不生成标签名）
  const componentsConfig = {
    pages: {},
    widgets: {}
  };

  // 处理页面组件（使用原始组件名）
  if (components.pages) {
    for (const [name, page] of Object.entries(components.pages)) {
      componentsConfig.pages[name] = {
        background: page.background || ''
      };
    }
  }

  // 处理小部件组件（使用原始组件名）
  if (components.widgets) {
    for (const [name, widget] of Object.entries(components.widgets)) {
      componentsConfig.widgets[name] = {
        configComponentName: widget.configComponentName || null,
        size: widget.size || ['1x1'],
        background: widget.background || '',
        isModifyBackground: widget.isModifyBackground || false
      };
    }
  }

  appJson.components = componentsConfig;

  // 写入 app.json 文件
  const outputPath = join(__dirname, '../../app.json');
  writeFileSync(outputPath, JSON.stringify(appJson, null, 2), 'utf-8');

  console.log(`✅ app.json generated: ${outputPath}`);
  console.log(`📦 App: ${finalMicroId}`);
  console.log(`🔧 Environment: ${isDev ? 'development' : 'production'}`);
  console.log(`📄 Pages: ${Object.keys(componentsConfig.pages).join(', ')}`);
  console.log(`🎨 Widgets: ${Object.keys(componentsConfig.widgets).join(', ')}`);

  return appJson;
}

// 生成并导出
const appJson = generateAppJson();
export default appJson;
export { generateAppJson };
