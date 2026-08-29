/**
 * 组件配置文件
 * 类似于 vue 路由配置，name 值全局不可以重复
 */

// 导入组件对象（只在浏览器环境使用）
import { Widget as HelloWorldWidget } from '../src/components/widget.js';
import { WidgetConfig as HelloWorldConfig } from '../src/components/widgetConfig.js';

export default {
  // =======================
  // 页面注册
  // =======================
  pages: {
    'hello-world-config': {
      // 组件对象（直接引用）
      component: HelloWorldConfig,
      // 背景颜色 支持css样式，为空底色默认为白色
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      // 头部文字颜色
      headerTextColor: '#1890ff',
    },

  },

  // =======================
  // 小部件（卡片）注册
  // =======================
  widgets: {
    'hello-world-widget': {
      // 组件对象（直接引用）widgetId
      component: HelloWorldWidget,
      // 绑定的小部件配置 Page 组件名字
      // 当主平台添加当前应用的小部件时会以窗口的形式打开此组件页面进行配置
      configComponentName: 'hello-world-config',
      // 卡片尺寸: 1x1 1x2 1xfull 2x1 2x2 2x4
      size: ['1x1', '1x2', '1xfull', '2x1', '2x2', '2x4','4x4'],
      // 为空使用Sun-Panel默认背景颜色作为底色 支持css样式
      background: '',
      // v1.1 新增字段
      widgetName: '$t:WIDGET_HELLO_NAME',
      widgetDescription: '$t:WIDGET_HELLO_DESCRIPTION',
      sort: 10, // 排序权重，数字越小越靠前
    },
  },
};
