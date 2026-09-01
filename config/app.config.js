/**
 * 微应用配置文件
 * 应用基础配置
 */


export default {
  // =======================
  // 应用基础信息
  // =======================
  // 配置文件格式版本
  appJsonVersion: '1.1',
  // 作者标识
  author: 'sun-panel',
  // 应用唯一标识（作者标识-应用标识）
  microAppId: 'sun-panel-bookmark-conversion',
  // 应用版本
  version: '1.0.0',
  // 入口文件
  entry: 'main.js',
  // 图标
  icon: 'icon.png',
  // 调试模式（正式发布请设置为false）
  debug: false,

  // 应用信息（使用 '$t: xxx' 可以引用翻译）
  appInfo: {
    appName: '$t:APP_NAME',
    description: '$t:APP_DESCRIPTION',
    networkDescription: '$t:NETWORK_DESCRIPTION',
  },

  // 语言文件映射（appJsonVersion:1.1 新增）
  // 格式：{ 语言代码: 文件名 }
  // 文件名相对于 locales/ 目录，支持多语言代码指向同一文件
  locales: {
    'zh-CN': 'zh-CN.json',
    'en-US': 'en-US.json',
    // 'zh-TW': 'zh-CN.json',  // 示例：繁体中文可指向简体中文文件
  },

  // 默认语言（当主应用语言在微应用中不存在时，回退到此语言）
  // 如果不设置，默认为 'en-US'
  defaultLocale: 'zh-CN',

  // 权限配置
  permissions: [
    // 'network',
    // 'dataNode'
  ],

  // 网络域名白名单
  // favicon 获取依赖网络透传接口（服务端代理，不受浏览器 CORS 限制）：
  //  - 透传获取网页 HTML，解析 <link rel="icon"> 等真实图标地址
  //  - 远程图标 URL 为主（Sun Panel type=2 直接支持），获取率接近 100%
  //  - SVG 图标透传直接转换为本地文件（离线可用）；PNG/ICO 二进制经 JSON
  //    通道会损坏，改用 canvas 尽力下载，失败仍保留远程 URL
  networkDomains: [
    // 如需收紧，可在此列出允许的 favicon 域名（受主应用支持程度限制）
    '*',
  ],

  // 数据节点配置
  dataNodes: {

  },
};
