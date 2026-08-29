import { SunPanelPageElement } from '@sun-panel/micro-app';
import { html } from 'lit';

export class WidgetConfig extends SunPanelPageElement {
  static properties = {
    spCtx: { type: Object, attribute: false },
    widgetInfo: { type: Object },
    showLogo: { type: Boolean },
    textOption: { type: String },
    customText: { type: String },
    useSystemBgColor: { type: Boolean },
  };

  /**
   * 页面初始化时调用
   * i18n 已由基类 SunPanelPageElement 自动初始化，可直接使用 this.t()
   */
  onInitialized({ widgetInfo, customParam }) {
    console.log('[CardConfig] Initialized', widgetInfo, customParam);

    this.widgetInfo = widgetInfo;
    const config = widgetInfo?.config || {};
    this.showLogo = config.showLogo ?? true;
    this.textOption = config.textOption ?? 'toggle';
    this.customText = config.customText || '';
    this.useSystemBgColor = config.useSystemBgColor ?? false;
    this.requestUpdate();
  }

  async handleSaveOrCreateWidget() {
    console.log('Save or create widgets', this.widgetInfo);

    const currentConfig = this.widgetInfo?.config || {};
    this.spCtx.api.widget.save({
      ...this.widgetInfo,
      config: {
        ...currentConfig,
        showLogo: this.showLogo,
        textOption: this.textOption,
        customText: this.customText,
        useSystemBgColor: this.useSystemBgColor,
      },
    });
  }
  getButtonTitle() {
    return this.widgetInfo?.id !== 0 ? this.t('WIDGET_CONFIG_BUTTON_SAVE') : this.t('WIDGET_CONFIG_BUTTON_CREATE');
  }

  getTitle() {
    return this.widgetInfo?.id !== 0 ? this.t('WIDGET_CONFIG_TITLE_EDIT') : this.t('WIDGET_CONFIG_TITLE_ADD');
  }

  handleTextOptionChange(event) {
    this.textOption = event.target.value;
  }

  render() {
    const darkMode = this.spCtx?.darkMode ?? false;
    return html`
      <style>
        :host { height: 100%; width: 100%; display: block; }
        
        .container {
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
          color: ${darkMode ? '#e5e5e5' : '#262626'};
          display: flex;
          flex-direction: column;
        }
        
        .content-wrapper {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }
        
        .content-wrapper::-webkit-scrollbar { width: 6px; }
        .content-wrapper::-webkit-scrollbar-track { background: transparent; }
        .content-wrapper::-webkit-scrollbar-thumb {
          background: ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'};
          border-radius: 3px;
        }
        .content-wrapper::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'};
        }
        
        h1 { color: #1890ff; margin: 0 0 4px; font-size: 18px; font-weight: 600; }
        .subtitle { color: #8c8c8c; margin-bottom: 16px; font-size: 12px; }
        
        .form-section {
          background: ${darkMode ? 'rgba(38,38,38,0.7)' : 'rgba(250,250,250,0.7)'};
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
          border: 1px solid ${darkMode ? 'rgba(48,48,48,0.8)' : 'rgba(232,232,232,0.8)'};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: ${darkMode ? '#e5e5e5' : '#262626'};
          display: flex;
          align-items: center;
        }
        
        .section-title::before {
          content: '';
          width: 3px;
          height: 14px;
          background: #1890ff;
          margin-right: 6px;
          border-radius: 2px;
        }
        
        .form-group { margin: 12px 0; }
        .form-group:first-child { margin-top: 0; }
        .form-group:last-child { margin-bottom: 0; }
        
        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 13px;
          color: ${darkMode ? '#d9d9d9' : '#595959'};
        }
        
        .checkbox-label, .radio-option {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 8px 12px;
          background: ${darkMode ? '#1a1a1a' : '#fff'};
          border-radius: 4px;
          border: 1px solid ${darkMode ? '#303030' : '#d9d9d9'};
          transition: all 0.2s ease;
          margin-bottom: 6px;
        }
        
        .checkbox-label:hover, .radio-option:hover {
          border-color: #1890ff;
          background: ${darkMode ? '#262626' : '#f0f7ff'};
        }
        
        .checkbox-label input, .radio-option input {
          margin-right: 8px;
          width: 16px;
          height: 16px;
          accent-color: #1890ff;
        }
        
        .radio-group { display: flex; flex-direction: column; }
        .radio-option { margin-bottom: 0; border-radius: 0; }
        .radio-option:first-child { border-radius: 4px 4px 0 0; }
        .radio-option:last-child { border-radius: 0 0 4px 4px; }
        .radio-group .radio-option + .radio-option { border-top: none; }
        
        input.styled-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid ${darkMode ? '#303030' : '#d9d9d9'};
          border-radius: 4px;
          font-size: 13px;
          color: ${darkMode ? '#e5e5e5' : '#262626'};
          background: ${darkMode ? '#1a1a1a' : '#fff'};
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        
        input.styled-input:focus {
          outline: none;
          border-color: #1890ff;
          box-shadow: 0 0 0 3px rgba(24,144,255,0.1);
        }
        
        .debug-info {
          background: ${darkMode ? '#1a1a1a' : '#f5f5f5'};
          border: 1px dashed ${darkMode ? '#303030' : '#d9d9d9'};
          border-radius: 4px;
          padding: 10px;
          margin: 12px 0;
          font-family: monospace;
          font-size: 11px;
          color: #8c8c8c;
          word-break: break-all;
          max-height: 150px;
          overflow-y: auto;
        }
        
        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid ${darkMode ? '#303030' : '#e8e8e8'};
          flex-shrink: 0;
        }
        
        button[type="button"] {
          padding: 8px 24px;
          background: #1890ff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(24,144,255,0.15);
        }
        
        button[type="button"]:hover {
          background: #40a9ff;
          box-shadow: 0 4px 8px rgba(24,144,255,0.25);
          transform: translateY(-1px);
        }
        
        button[type="button"]:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(24,144,255,0.15);
        }
      </style>
      <div class="container">
        <div class="content-wrapper">
          <h1>${this.getTitle()}</h1>
          <p class="subtitle">${this.t('WIDGET_CONFIG_SUBTITLE')}</p>
          
          <form @submit="${(e) => e.preventDefault()}">
            <div class="form-section">
              <div class="section-title">${this.t('WIDGET_CONFIG_SECTION_APPEARANCE')}</div>
              <div class="form-group">
                <label>${this.t('WIDGET_CONFIG_LABEL_BACKGROUND')}</label>
                <label class="checkbox-label">
                  <input type="checkbox" id="useSystemBgColor" name="useSystemBgColor" .checked="${this.useSystemBgColor}" @change="${(e) => this.useSystemBgColor = e.target.checked}">
                  ${this.t('WIDGET_CONFIG_LABEL_USE_SYSTEM_BG')}
                </label>
              </div>
              
              <div class="form-group">
                <label>${this.t('WIDGET_CONFIG_LABEL_SHOW_LOGO')}</label>
                <label class="checkbox-label">
                  <input type="checkbox" id="showLogo" name="showLogo" .checked="${this.showLogo}" @change="${(e) => this.showLogo = e.target.checked}">
                  ${this.t('WIDGET_CONFIG_LABEL_SHOW_LOGO')}
                </label>
              </div>
            </div>
            
            <div class="form-section">
              <div class="section-title">${this.t('WIDGET_CONFIG_SECTION_TEXT')}</div>
              <div class="form-group">
                <label>${this.t('WIDGET_CONFIG_LABEL_DISPLAY_MODE')}</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" name="textOption" value="toggle" .checked="${this.textOption === 'toggle'}" @change="${this.handleTextOptionChange}">
                    ${this.t('WIDGET_CONFIG_OPTION_TOGGLE')}
                  </label>
                  <label class="radio-option">
                    <input type="radio" name="textOption" value="custom" .checked="${this.textOption === 'custom'}" @change="${this.handleTextOptionChange}">
                    ${this.t('WIDGET_CONFIG_OPTION_CUSTOM')}
                  </label>
                </div>
              </div>
              
              ${this.textOption === 'custom' ? html`
                <div class="form-group">
                  <label for="customText">${this.t('WIDGET_CONFIG_LABEL_CUSTOM_TEXT')}</label>
                  <input
                    type="text"
                    id="customText"
                    name="customText"
                    .value="${this.customText}"
                    @input="${(e) => this.customText = e.target.value}"
                    placeholder="${this.t('WIDGET_CONFIG_PLACEHOLDER_CUSTOM_TEXT',{name:'测试名字'})}"
                    class="styled-input"
                  >
                </div>
              ` : ''}
            </div>
            
            <div class="debug-info">
              <strong>${this.t('WIDGET_CONFIG_DEBUG_TITLE')}</strong>${JSON.stringify(this.widgetInfo, null, 2)}
            </div>
          </form>
        </div>
        
        <div class="button-container">
          <button type="button" @click=${this.handleSaveOrCreateWidget}>${this.getButtonTitle()}</button>
        </div>
      </div>
    `;
  }
}
