/**
 * 书签转换工具 - 小部件组件
 * 点击小部件打开书签转换工具页面
 */
import { SunPanelWidgetElement } from '@sun-panel/micro-app';
import { html, css } from 'lit';

export class BookmarkConversionWidget extends SunPanelWidgetElement {
  static properties = {
    spCtx: { type: Object, attribute: false },
  };

  onInitialized() {
    // i18n 由基类自动初始化
  }

  /** 点击小部件，打开书签转换工具页面 */
  openToolPage() {
    this.spCtx?.api?.window?.open?.({
      componentName: 'bookmark-conversion-main',
      title: this.t('BM_TITLE'),
      windowConfig: {
        width: 960,
        height: 720,
        resize: true,
        move: true,
      },
    });
  }

  /** 图标 */
  renderIcon() {
    return html`<img class="widget-icon" src=${this.getAssetPath('/icon.png')} alt="bookmark-conversion" />`;
  }

  /** 标题 + 描述 */
  renderTitle() {
    return html`
      <div class="text-wrap">
        <div class="widget-title">${this.t('BM_TITLE')}</div>
        <div class="widget-desc">${this.t('BM_SUBTITLE')}</div>
      </div>
    `;
  }

  render1x1() {
    return html`
      <div class="container container-1x1" @click=${this.openToolPage}>
        ${this.renderIcon()}
      </div>
    `;
  }

  render1x2() {
    return html`
      <div class="container container-row" @click=${this.openToolPage}>
        ${this.renderIcon()}
        <div class="text-wrap">
          <div class="widget-title">${this.t('BM_TITLE')}</div>
        </div>
      </div>
    `;
  }

  render2x2() {
    return html`
      <div class="container" @click=${this.openToolPage}>
        ${this.renderIcon()}
        ${this.renderTitle()}
      </div>
    `;
  }

  render() {
    const gridSize = this.spCtx?.widgetInfo?.gridSize;
    const isDark = this.spCtx?.darkMode;
    const bg = isDark ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)';
    return html`
      <div class="root" style="background: ${bg}">
        ${gridSize === '1x1' ? this.render1x1() : ''}
        ${gridSize === '1x2' ? this.render1x2() : ''}
        ${gridSize === '2x2' ? this.render2x2() : ''}
      </div>
    `;
  }

  static styles = css`
    .root {
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .container {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      padding: 12px;
      box-sizing: border-box;
    }
    .container-row {
      flex-direction: row;
    }
    .container-1x1 {
      gap: 0;
      padding: 8px;
    }
    .widget-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }
    .container-1x1 .widget-icon {
      width: 100%;
      height: 100%;
      border-radius: 10px;
    }
    .text-wrap {
      min-width: 0;
    }
    .widget-title {
      font-size: 15px;
      font-weight: 600;
      color: #4f46e5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .widget-desc {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;
}
