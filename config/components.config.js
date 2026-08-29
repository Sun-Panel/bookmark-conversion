/**
 * 组件配置文件
 * 类似于 vue 路由配置，name 值全局不可以重复
 */

// 导入组件对象（只在浏览器环境使用）
import { BookmarkConversionPage } from '../src/components/bookmarkPage.js';
import { BookmarkConversionWidget } from '../src/components/widget.js';

export default {
  // =======================
  // 页面注册
  // =======================
  pages: {
    'bookmark-conversion-main': {
      // 组件对象（直接引用）
      component: BookmarkConversionPage,
      // 背景颜色 支持css样式，为空底色默认为白色
      background: '',
      // 头部文字颜色
      headerTextColor: '#1890ff',
      // 微应用入口页面/主页面
      type: 'main',
    },
  },

  // =======================
  // 小部件（卡片）注册
  // =======================
  widgets: {
    'bookmark-conversion-widget': {
      // 组件对象（直接引用）widgetId
      component: BookmarkConversionWidget,
      // 卡片尺寸: 1x1 1x2 2x2
      size: ['1x1', '1x2', '2x2'],
      // 为空使用Sun-Panel默认背景颜色作为底色 支持css样式
      background: '',
      // v1.1 新增字段
      widgetName: '$t:WIDGET_BM_NAME',
      widgetDescription: '$t:WIDGET_BM_DESCRIPTION',
      sort: 10, // 排序权重，数字越小越靠前
    },
  },
};
