import { SunPanelWidgetElement } from '@sun-panel/micro-app';
import { html, css } from 'lit';

export class Widget extends SunPanelWidgetElement {
  static properties = {
    spCtx: { type: Object, attribute: false },
    name: { type: String },
  };

  onInitialized() {
    this.name = 'World';
    this.handleChangeName();
  }

  handleChangeName() {
    if (this.spCtx?.widgetInfo?.config?.textOption === 'custom') {
      this.name = this.spCtx.widgetInfo.config?.customText;
      return;
    }
    this.name = this.name === 'World' ? 'Sun-Panel' : 'World';
  }

  onWidgetInfoChanged(newWidgetInfo, _oldWidgetInfo) {
    if (newWidgetInfo?.config?.textOption === 'custom') {
      this.name = newWidgetInfo.config?.customText;
    } else {
      this.name = 'World';
    }
    this.requestUpdate();
  }

  render1x1() {
    return html`<div class="greeting" style="font-size: 20px;margin: 5px;">Hello !</div>`;
  }

  render1x2() {
    return html`<div class="greeting" style="font-size: 20px;">Hello, <span class="name" @click=${this.handleChangeName}>${this.name} </span> !</div>`;
  }

  render2x1() {
    return html`<div class="greeting" style="margin: 5px;font-size: 20px;">Hello, <span class="name" @click=${this.handleChangeName}>${this.name} </span> !</div>`;
  }

  render2x2() {
    return html`<div class="greeting" style="font-size: 20px;">Hello, <span class="name" @click=${this.handleChangeName}>${this.name} </span> !</div>`;
  }

  render2x4() {
    return html`<div class="greeting" style="font-size: 30px;">Hello, <span class="name" @click=${this.handleChangeName}>${this.name} </span> !</div>`;
  }

  render4x4() {
    return html`<div class="greeting" style="font-size: 35px;">Hello, <span class="name" @click=${this.handleChangeName}>${this.name} </span> !</div>`;
  }

  render1xfull() {
    return this.render2x4();
  }

  render() {
    const showLogo = this.spCtx?.widgetInfo?.config?.showLogo ?? true;
    const useSystemBgColor = this.spCtx?.widgetInfo?.config?.useSystemBgColor ?? false;
    return html`
      <div class="container" style="background: ${useSystemBgColor ? 'transparent' : ((this.spCtx && this.spCtx.darkMode) ? '#181818' : 'white')}">
        ${showLogo ? html`<div class="background-image"><img src=${this.getAssetPath('/sun-panel-logo.png')} /></div>` : ''}
        ${this.spCtx.widgetInfo.gridSize === '1x1' ? this.render1x1() : ''}
        ${this.spCtx.widgetInfo.gridSize === '1x2' ? this.render1x2() : ''}
        ${this.spCtx.widgetInfo.gridSize === '2x1' ? this.render2x1() : ''}
        ${this.spCtx.widgetInfo.gridSize === '2x2' ? this.render2x2() : ''}
        ${this.spCtx.widgetInfo.gridSize === '2x4' ? this.render2x4() : ''}
        ${this.spCtx.widgetInfo.gridSize === '4x4' ? this.render4x4() : ''}
        ${this.spCtx.widgetInfo.gridSize === '1xfull' ? this.render1xfull() : ''}
      </div>
    `;
  }

  static styles = css`.greeting{font-weight:bold;color:#1890ff;z-index:1}.container{font-family:Arial,sans-serif;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative}.background-image{position:absolute;height:60%;right:10px;top:10px;pointer-events:none;transform:rotate(-15deg);opacity:0.5;filter:blur(5px)}.background-image img{width:100%;height:100%;object-fit:cover}.name{cursor:pointer;font-weight:bold;background:linear-gradient(45deg,#1890ff,#00c4ff,#00ff87);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:20px 0}`;
}

