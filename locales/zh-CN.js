/**
 * 中文翻译文件
 * 格式：{ "KEY": "value" }
 */

export default {
  // 应用基本信息
  APP_NAME: '书签转换工具',
  APP_DESCRIPTION: '将浏览器导出的 HTML 书签文件转换为 Sun-Panel v2 可导入的配置文件',
  NETWORK_DESCRIPTION: '需联网获取 favicon（通过网络透传解析网页真实图标，远程图标 URL 获取率接近 100%，本地化尽力而为）',

  // 小部件
  WIDGET_BM_NAME: '书签转换工具',
  WIDGET_BM_DESCRIPTION: '将浏览器 HTML 书签转换为 Sun-Panel 配置文件，点击打开工具',

  // 页面标题
  BM_TITLE: '书签转换工具',
  BM_SUBTITLE: '将浏览器导出的 HTML 书签文件，转换为 Sun-Panel v2 可导入的配置文件（config.json + 图标目录）',

  // 按钮
  BM_BUTTON_IMPORT: '1. 导入 HTML 书签文件',
  BM_BUTTON_CONVERT: '2. 开始转换',
  BM_BUTTON_EXPORT: '3. 导出配置文件',
  BM_CONVERTING: '转换中...',
  BM_EXPORTING: '导出中...',
  BM_CONFIRM_EXPORT: '确认导出',
  BM_CANCEL: '取消',
  BM_NO_FILE_SELECTED: '未选择文件',
  BM_DEDUPE: '去重',
  BM_DEDUPE_TIP: '移除 URL 和标题完全相同的重复链接（保留第一个）',

  // 提示
  BM_NO_FILE: '请先导入 HTML 书签文件',
  BM_IMPORT_ERROR: '文件读取失败，请重试',
  BM_PARSE_EMPTY: '未解析到有效的书签内容，请确认文件格式（Netscape 书签 HTML）',
  BM_PARSE_ERROR: '解析书签文件失败',
  BM_EXPORT_NONE: '请先勾选要导出的链接',
  BM_EXPORT_SUCCESS: '导出成功！已生成 {count} 个链接的配置文件',
  BM_EXPORT_ERROR: '导出失败，请重试',
  BM_DEDUPE_DONE: '已移除 {count} 个重复链接',
  BM_DEDUPE_NONE: '未发现重复链接',

  // 统计
  BM_STAT_GROUPS: '分组',
  BM_STAT_LINKS: '链接',
  BM_STAT_CHECKED: '已选',
  BM_STAT_ICONS: '图标',
  BM_FAVICON_DOWNLOADING: 'favicon 下载中',
  BM_FAVICON_SUCCESS: '成功',

  // 树操作
  BM_SELECT_ALL: '全部选中',
  BM_CLEAR_ALL: '清空',
  BM_TREE_EMPTY: '没有可显示的链接',
  BM_TREE_HINT: '导入并转换后，此处将显示可勾选的书签树形列表',

  // 预览 Tab
  BM_TAB_PLANS: '方案预览',
  BM_TAB_TREE: '原始树',
  BM_FOLDER_EMPTY: '空',
  BM_PREVIEW_MORE: '等 {count} 个链接',

  // 导出对话框
  BM_EXPORT_TITLE: '选择分组方案',
  BM_PLAN_A_TITLE: '方案A：顶层分组',
  BM_PLAN_A_DESC: '仅顶层文件夹作为分组，所有层级的链接平铺到所属顶层分组（分组少、每组大）',
  BM_PLAN_B_TITLE: '方案B：全量文件夹分组',
  BM_PLAN_B_DESC: '所有层级（含非顶层）的文件夹都提升为分组，链接归属其直接父文件夹（分组多、每组小）',

  BM_FOOTER_HINT: '提示：图标自动获取（base64 图标 100% 转换；其余通过网络透传解析网页真实图标，远程图标 URL 为主、本地文件尽力而为，仅极少数无图标的退回文字图标）；导出文件可直接在 Sun-Panel 中导入',
};
