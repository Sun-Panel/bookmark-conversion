import { SunPanelPageElement } from '@sun-panel/micro-app';
import { html, css } from 'lit';
import JSZip from 'jszip';
import {
  parseBookmarkHTML, walkTree, countTree, isValidUrl,
} from '../utils/bookmarkParser.js';
import {
  buildGroupsPlanA, buildGroupsPlanB, createConfigV2,
  ICON_FOLDER_NAME, resolveDataUriIcon, getTextIconChar, getTextIconColor,
} from '../utils/configGenerator.js';
import { downloadFavicon, runWithConcurrency } from '../utils/faviconDownloader.js';
import { md5Bytes } from '../utils/md5.js';

/**
 * 书签转换工具主页面
 * 功能：
 *  1. 导入 HTML 书签文件
 *  2. 开始转换（解析 + 图标提取 + favicon 下载）
 *  3. 导出 Sun Panel v2 配置文件（ZIP）
 */
export class BookmarkConversionPage extends SunPanelPageElement {
  static properties = {
    spCtx: { type: Object, attribute: false },
  };

  constructor() {
    super();
    // 应用状态
    this.fileName = '';
    this.htmlText = '';
    this.tree = [];
    this.treeReady = false;
    this.converting = false;

    // 勾选 / 折叠状态
    this.checkedIds = new Set();
    this.collapsedIds = new Set();

    // 图标集合
    this.iconFiles = new Map();       // fileName -> Blob
    this.linkFaviconMap = new Map();  // linkId -> faviconFileName

    // favicon 下载进度
    this.faviconState = null;         // { total, done, success, fail, running }

    // 导出对话框
    this.showExportDialog = false;
    this.exportPlan = 'A';
    this.exporting = false;
    this.exportMessage = '';

    // 错误提示
    this.errorMessage = '';
  }

  onInitialized() {
    // 页面初始化完成
  }

  // ============================================================
  // 按钮1：导入 HTML 书签文件
  // ============================================================
  handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file)
    {return;}
    const reader = new FileReader();
    reader.onload = () => {
      this.htmlText = String(reader.result || '');
      this.fileName = file.name;
      this.errorMessage = '';
      this.treeReady = false;
      this.tree = [];
      this.checkedIds.clear();
      this.collapsedIds.clear();
      this.iconFiles.clear();
      this.linkFaviconMap.clear();
      this.faviconState = null;
      this.requestUpdate();
    };
    reader.onerror = () => {
      this.errorMessage = this.t('BM_IMPORT_ERROR');
      this.requestUpdate();
    };
    reader.readAsText(file, 'UTF-8');
    // 重置 input 以便重复选择同一文件
    event.target.value = '';
  }

  // ============================================================
  // 按钮2：开始转换
  // ============================================================
  async handleConvert() {
    if (!this.htmlText) {
      this.errorMessage = this.t('BM_NO_FILE');
      this.requestUpdate();
      return;
    }
    this.converting = true;
    this.errorMessage = '';

    try {
      // 解析书签
      const rootNodes = parseBookmarkHTML(this.htmlText);
      if (!rootNodes.length) {
        this.errorMessage = this.t('BM_PARSE_EMPTY');
        this.converting = false;
        this.requestUpdate();
        return;
      }

      // 为每个节点生成 id（路径）
      this.tree = rootNodes;
      this.checkedIds.clear();
      this.collapsedIds.clear();
      this.iconFiles.clear();
      this.linkFaviconMap.clear();
      this.faviconState = null;

      walkTree(this.tree, (node, parent, path) => {
        node.id = path.join('_');
        node.parent = parent;
        // 默认全部勾选
        if (node.type === 'link') {
          this.checkedIds.add(node.id);
        }
      });

      // 提取 base64 图标（同步）
      walkTree(this.tree, (node) => {
        if (node.type === 'link' && node.icon && node.icon.startsWith('data:')) {
          const resolved = resolveDataUriIcon(node.icon);
          if (resolved && !this.iconFiles.has(resolved.fileName)) {
            this.iconFiles.set(resolved.fileName, new Blob([resolved.data], { type: resolved.mime }));
          }
        }
      });

      // 统计需要 favicon 下载的链接（无图标、且是合法网页链接）
      const faviconTargets = [];
      walkTree(this.tree, (node) => {
        if (node.type !== 'link')
        {return;}
        if (!isValidUrl(node.url))
        {return;}
        const hasDataIcon = node.icon && node.icon.startsWith('data:');
        const hasUrlIcon = node.icon && /^https?:\/\//i.test(node.icon);
        if (!hasDataIcon && !hasUrlIcon) {
          faviconTargets.push(node);
        }
      });

      this.treeReady = true;
      this.converting = false;
      this.requestUpdate();

      // 自动后台下载 favicon（不阻塞）
      if (faviconTargets.length > 0) {
        this.startFaviconDownload(faviconTargets);
      }
    }
    catch (err) {
      console.error('[BookmarkConversion] convert error:', err);
      this.errorMessage = this.t('BM_PARSE_ERROR');
      this.converting = false;
      this.requestUpdate();
    }
  }

  // ============================================================
  // favicon 自动下载（后台，限并发）
  // ============================================================
  async startFaviconDownload(targets) {
    this.faviconState = { total: targets.length, done: 0, success: 0, fail: 0 };
    this.requestUpdate();

    await runWithConcurrency(targets, 6, async (link) => {
      if (!link || link.type !== 'link')
      {return;}
      let blob = null;
      try {
        blob = await downloadFavicon(link.url);
      }
      catch {
        blob = null;
      }
      if (blob && blob.size > 0) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fileName = `${md5Bytes(bytes)}.png`;
        if (!this.iconFiles.has(fileName)) {
          this.iconFiles.set(fileName, new Blob([bytes], { type: 'image/png' }));
        }
        this.linkFaviconMap.set(link.id, fileName);
        // 缓存 data URL 用于树形列表展示（避免 object URL 泄漏）
        link.faviconDataUrl = await blobToDataURL(blob);
        this.faviconState.success++;
      }
      else {
        this.faviconState.fail++;
      }
      this.faviconState.done++;
      this.requestUpdate();
    });

    this.requestUpdate();
  }

  // ============================================================
  // 去重按钮
  // ============================================================
  handleDeduplicate() {
    if (!this.treeReady)
    {return;}
    const seen = new Map(); // key: url + '|' + title -> count
    let removed = 0;

    const walk = (children) => {
      const kept = [];
      for (const child of children) {
        if (child.type === 'link') {
          const key = `${child.url}|${child.title}`;
          if (seen.has(key)) {
            removed++;
            this.checkedIds.delete(child.id);
            continue; // 跳过重复
          }
          seen.set(key, true);
        }
        else if (child.type === 'folder') {
          walk(child.children);
        }
        kept.push(child);
      }
      // 原地替换
      children.length = 0;
      children.push(...kept);
    };

    walk(this.tree);
    this.requestUpdate();

    if (removed > 0) {
      this.errorMessage = '';
      // 提示已去重数量
      this.dedupeMessage = this.t('BM_DEDUPE_DONE', { count: removed });
      setTimeout(() => { this.dedupeMessage = ''; this.requestUpdate(); }, 3000);
    }
    else {
      this.dedupeMessage = this.t('BM_DEDUPE_NONE');
      setTimeout(() => { this.dedupeMessage = ''; this.requestUpdate(); }, 3000);
    }
  }

  // ============================================================
  // 勾选逻辑
  // ============================================================
  getFolderCheckState(folder) {
    let linkTotal = 0;
    let checkedCount = 0;
    const scan = (children) => {
      for (const child of children) {
        if (child.type === 'link') {
          linkTotal++;
          if (this.checkedIds.has(child.id))
          {checkedCount++;}
        }
        else if (child.type === 'folder') {
          scan(child.children);
        }
      }
    };
    scan(folder.children);
    if (linkTotal === 0)
    {return 'none';}
    if (checkedCount === linkTotal)
    {return 'all';}
    if (checkedCount > 0)
    {return 'partial';}
    return 'none';
  }

  toggleFolder(folder) {
    const links = [];
    const scan = (children) => {
      for (const child of children) {
        if (child.type === 'link') {
          links.push(child.id);
        }
        else if (child.type === 'folder') {
          scan(child.children);
        }
      }
    };
    scan(folder.children);
    const state = this.getFolderCheckState(folder);
    if (state === 'all' || state === 'partial') {
      links.forEach(id => this.checkedIds.delete(id));
    }
    else {
      links.forEach(id => this.checkedIds.add(id));
    }
    this.requestUpdate();
  }

  toggleLink(id) {
    if (this.checkedIds.has(id)) {
      this.checkedIds.delete(id);
    }
    else {
      this.checkedIds.add(id);
    }
    this.requestUpdate();
  }

  selectAll() {
    this.checkedIds.clear();
    walkTree(this.tree, (node) => {
      if (node.type === 'link')
      {this.checkedIds.add(node.id);}
    });
    this.requestUpdate();
  }

  clearAll() {
    this.checkedIds.clear();
    this.requestUpdate();
  }

  toggleCollapse(id) {
    if (this.collapsedIds.has(id)) {
      this.collapsedIds.delete(id);
    }
    else {
      this.collapsedIds.add(id);
    }
    this.requestUpdate();
  }

  // ============================================================
  // 按钮3：导出配置文件
  // ============================================================
  handleExport() {
    if (!this.treeReady)
    {return;}
    if (this.checkedIds.size === 0) {
      this.exportMessage = this.t('BM_EXPORT_NONE');
      setTimeout(() => { this.exportMessage = ''; this.requestUpdate(); }, 3000);
      this.requestUpdate();
      return;
    }
    this.showExportDialog = true;
    this.exportPlan = 'A';
    this.exportMessage = '';
    this.requestUpdate();
  }

  closeExportDialog() {
    this.showExportDialog = false;
    this.requestUpdate();
  }

  async confirmExport() {
    this.exporting = true;
    this.exportMessage = '';
    this.requestUpdate();

    try {
      // 收集勾选的链接（保持树中顺序）
      const checkedLinks = [];
      const collect = (children) => {
        for (const child of children) {
          if (child.type === 'link' && this.checkedIds.has(child.id)) {
            checkedLinks.push(child);
          }
          else if (child.type === 'folder') {
            collect(child.children);
          }
        }
      };
      collect(this.tree);

      // 构建分组（方案A / 方案B）
      const plan = this.exportPlan === 'B' ? 'B' : 'A';
      const groupFn = plan === 'B' ? buildGroupsPlanB : buildGroupsPlanA;
      const groups = groupFn(this.tree);

      // 仅保留勾选的链接（过滤组内未勾选的节点）
      const checkedSet = new Set(checkedLinks.map(l => l.id));
      const filteredGroups = groups
        .map(g => ({ ...g, nodes: g.nodes.filter(n => n.type === 'link' && checkedSet.has(n.id)) }))
        .filter(g => g.nodes.length > 0);

      if (filteredGroups.length === 0) {
        this.exportMessage = this.t('BM_EXPORT_NONE');
        this.exporting = false;
        this.requestUpdate();
        return;
      }

      // 生成 config.json
      const { config, itemCount, usedIconFiles } = createConfigV2(filteredGroups, {
        iconFiles: this.iconFiles,
        linkFaviconMap: this.linkFaviconMap,
      });

      // 打包 ZIP
      const zip = new JSZip();
      zip.file('config.json', JSON.stringify(config, null, 2));
      const iconFolder = zip.folder(ICON_FOLDER_NAME);
      for (const fileName of usedIconFiles) {
        const blob = this.iconFiles.get(fileName);
        if (blob) {
          iconFolder.file(fileName, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      // 下载
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = formatZipFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      this.exporting = false;
      this.showExportDialog = false;
      this.exportMessage = this.t('BM_EXPORT_SUCCESS', { count: itemCount });
      setTimeout(() => { this.exportMessage = ''; this.requestUpdate(); }, 5000);
      this.requestUpdate();
    }
    catch (err) {
      console.error('[BookmarkConversion] export error:', err);
      this.exporting = false;
      this.exportMessage = this.t('BM_EXPORT_ERROR');
      this.requestUpdate();
    }
  }

  // ============================================================
  // 统计
  // ============================================================
  getStats() {
    if (!this.treeReady)
    {return null;}
    const { folders, links } = countTree(this.tree);
    let checked = 0;
    walkTree(this.tree, (node) => {
      if (node.type === 'link' && this.checkedIds.has(node.id))
      {checked++;}
    });
    const iconCount = this.iconFiles.size;
    const faviconDone = this.faviconState ? this.faviconState.done : 0;
    const faviconTotal = this.faviconState ? this.faviconState.total : 0;
    return { folders, links, checked, iconCount, faviconDone, faviconTotal };
  }

  // ============================================================
  // 渲染
  // ============================================================
  renderTreeNode(node, depth = 0) {
    if (node.type === 'folder') {
      const state = this.getFolderCheckState(node);
      const collapsed = this.collapsedIds.has(node.id);
      return html`
        <div class="tree-folder">
          <div class="tree-row folder-row" style="padding-left: ${depth * 20}px">
            <span class="collapse-icon" @click=${() => this.toggleCollapse(node.id)}>
              ${collapsed ? '▸' : '▾'}
            </span>
            <label class="check-label">
              <input type="checkbox"
                .indeterminate=${state === 'partial'}
                .checked=${state === 'all' || state === 'partial'}
                @change=${() => this.toggleFolder(node)}>
            </label>
            <span class="folder-icon">📁</span>
            <span class="folder-name" @click=${() => this.toggleCollapse(node.id)}>${node.title}</span>
            <span class="folder-count">(${countLinks(node.children)})</span>
          </div>
          ${collapsed ? '' : html`
            <div class="tree-children">
              ${node.children.map(child => this.renderTreeNode(child, depth + 1))}
            </div>
          `}
        </div>
      `;
    }

    // link 节点
    const checked = this.checkedIds.has(node.id);
    const iconHtml = this.renderLinkIcon(node);
    return html`
      <div class="tree-row link-row" style="padding-left: ${depth * 20 + 24}px">
        <label class="check-label">
          <input type="checkbox" .checked=${checked} @change=${() => this.toggleLink(node.id)}>
        </label>
        ${iconHtml}
        <span class="link-title" title="${node.title}${node.url ? '\n' + node.url : ''}">${node.title}</span>
        <a class="link-url" href="${node.url}" target="_blank" rel="noopener noreferrer" @click=${(e) => e.stopPropagation()}>${node.url}</a>
      </div>
    `;
  }

  renderLinkIcon(node) {
    // base64 图标直接显示
    if (node.icon && node.icon.startsWith('data:')) {
      return html`<span class="link-icon"><img src=${node.icon} alt=""></span>`;
    }
    // URL 图标
    if (node.icon && /^https?:\/\//i.test(node.icon)) {
      return html`<span class="link-icon"><img src=${node.icon} alt="" loading="lazy"></span>`;
    }
    // favicon 下载成功：显示 data URL
    if (node.faviconDataUrl) {
      return html`<span class="link-icon"><img src=${node.faviconDataUrl} alt=""></span>`;
    }
    // 文字图标
    return html`<span class="link-icon" style="background:${getTextIconColor(node.title)}">${getTextIconChar(node.title)}</span>`;
  }

  render() {
    const darkMode = this.spCtx?.darkMode ?? false;
    const stats = this.getStats();

    return html`
      <style>
        :host { height: 100%; width: 100%; display: block; }
        .container {
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
          color: ${darkMode ? '#e5e5e5' : '#262626'};
          display: flex;
          flex-direction: column;
          max-width: 1100px;
          margin: 0 auto;
        }
        h1 { color: #1890ff; margin: 0 0 4px; font-size: 20px; font-weight: 600; display:flex; align-items:center; gap:8px;}
        .subtitle { color: #8c8c8c; margin: 0 0 16px; font-size: 12px; }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }
        .btn {
          padding: 8px 18px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 0 2px 4px rgba(24,144,255,.15);
          white-space: nowrap;
        }
        .btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; box-shadow: none; }
        .btn-primary { background: #1890ff; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #40a9ff; box-shadow: 0 4px 8px rgba(24,144,255,.25); transform: translateY(-1px); }
        .btn-success { background: #52c41a; color: #fff; }
        .btn-success:hover:not(:disabled) { background: #73d13d; box-shadow: 0 4px 8px rgba(82,196,26,.25); transform: translateY(-1px); }
        .btn-warning { background: #fa8c16; color: #fff; }
        .btn-warning:hover:not(:disabled) { background: #ffa940; box-shadow: 0 4px 8px rgba(250,140,22,.25); transform: translateY(-1px); }
        .btn-ghost { background: ${darkMode ? '#1f1f1f' : '#fff'}; color: ${darkMode ? '#e5e5e5' : '#595959'}; border: 1px solid ${darkMode ? '#434343' : '#d9d9d9'}; box-shadow: none; }
        .btn-ghost:hover:not(:disabled) { border-color: #1890ff; color: #1890ff; }

        .file-name { font-size: 12px; color: ${darkMode ? '#aaa' : '#888'}; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .status-bar {
          display: flex; flex-wrap: wrap; gap: 8px 20px;
          background: ${darkMode ? 'rgba(38,38,38,.7)' : 'rgba(250,250,250,.8)'};
          border: 1px solid ${darkMode ? 'rgba(60,60,60,.8)' : 'rgba(232,232,232,.8)'};
          border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px;
        }
        .status-item { display: flex; align-items: center; gap: 4px; }
        .status-item b { color: #1890ff; font-weight: 600; }
        .favicon-progress { color: ${darkMode ? '#aaa' : '#888'}; }
        .favicon-progress .bar {
          display: inline-block; width: 90px; height: 6px; border-radius: 3px;
          background: ${darkMode ? '#333' : '#eee'}; overflow: hidden; vertical-align: middle; margin-left: 6px;
        }
        .favicon-progress .bar-inner { height: 100%; background: #52c41a; border-radius: 3px; transition: width .3s; }

        .message { font-size: 12px; margin-bottom: 10px; padding: 6px 10px; border-radius: 4px; }
        .message-error { background: rgba(255,77,79,.12); color: #ff4d4f; }
        .message-success { background: rgba(82,196,26,.12); color: #52c41a; }

        .tree-container {
          flex: 1; overflow-y: auto; min-height: 200px;
          border: 1px solid ${darkMode ? 'rgba(60,60,60,.8)' : 'rgba(232,232,232,.8)'};
          border-radius: 8px; padding: 8px 6px;
          background: ${darkMode ? 'rgba(20,20,20,.5)' : 'rgba(255,255,255,.6)'};
        }
        .tree-empty { text-align: center; color: #8c8c8c; padding: 40px 0; font-size: 13px; }

        .tree-row {
          display: flex; align-items: center; gap: 6px;
          padding: 3px 4px; border-radius: 4px; font-size: 13px;
        }
        .tree-row:hover { background: ${darkMode ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'}; }
        .folder-row { font-weight: 600; }
        .folder-name { cursor: pointer; }
        .folder-name:hover { color: #1890ff; }
        .folder-count { color: #8c8c8c; font-weight: 400; font-size: 12px; }
        .collapse-icon { width: 14px; text-align: center; cursor: pointer; color: #8c8c8c; user-select: none; }
        .check-label input { width: 15px; height: 15px; accent-color: #1890ff; cursor: pointer; }
        .link-icon {
          width: 22px; height: 22px; border-radius: 5px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff; overflow: hidden;
        }
        .link-icon img { width: 100%; height: 100%; object-fit: contain; }
        .link-title { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .link-url { font-size: 11px; color: ${darkMode ? '#666' : '#aaa'}; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
        .link-url:hover { color: #1890ff; text-decoration: underline; }
        .tree-children { margin-top: 1px; }

        .tree-actions { display: flex; gap: 10px; margin-bottom: 10px; font-size: 12px; }
        .tree-actions a { color: #1890ff; cursor: pointer; text-decoration: none; }
        .tree-actions a:hover { text-decoration: underline; }

        /* 导出对话框 */
        .dialog-mask {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center; z-index: 100;
        }
        .dialog {
          width: 420px; max-width: 90%; border-radius: 10px;
          background: ${darkMode ? '#1f1f1f' : '#fff'};
          padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,.2);
          color: ${darkMode ? '#e5e5e5' : '#262626'};
        }
        .dialog h3 { margin: 0 0 14px; font-size: 16px; }
        .plan-option {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 10px 12px; border: 1px solid ${darkMode ? '#434343' : '#d9d9d9'};
          border-radius: 6px; margin-bottom: 8px; cursor: pointer; font-size: 13px;
          transition: all .2s;
        }
        .plan-option.selected { border-color: #1890ff; background: ${darkMode ? 'rgba(24,144,255,.1)' : 'rgba(24,144,255,.06)'}; }
        .plan-option input { margin-top: 2px; accent-color: #1890ff; }
        .plan-option .plan-title { font-weight: 600; }
        .plan-option .plan-desc { color: #8c8c8c; font-size: 12px; margin-top: 2px; }
        .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
        .btn-cancel { background: ${darkMode ? '#2a2a2a' : '#f5f5f5'}; color: ${darkMode ? '#e5e5e5' : '#595959'}; }
        .btn-cancel:hover:not(:disabled) { border-color: #1890ff; color: #1890ff; }

        .footer-hint { margin-top: 10px; font-size: 11px; color: #8c8c8c; }
      </style>

      <div class="container">
        <h1>📌 ${this.t('BM_TITLE')}</h1>
        <p class="subtitle">${this.t('BM_SUBTITLE')}</p>

        <div class="toolbar">
          <button class="btn btn-primary" @click=${() => this.shadowRoot?.querySelector('#fileInput')?.click()}>
            ${this.t('BM_BUTTON_IMPORT')}
          </button>
          <input id="fileInput" type="file" accept=".html,.htm,text/html" style="display:none" @change=${this.handleFileChange}>
          <span class="file-name">${this.fileName || this.t('BM_NO_FILE_SELECTED')}</span>

          <button class="btn btn-success" @click=${this.handleConvert} ?disabled=${!this.htmlText || this.converting}>
            ${this.converting ? this.t('BM_CONVERTING') : this.t('BM_BUTTON_CONVERT')}
          </button>

          ${this.treeReady ? html`
            <button class="btn btn-ghost" @click=${this.handleDeduplicate} title="${this.t('BM_DEDUPE_TIP')}">
              ${this.t('BM_DEDUPE')}
            </button>
          ` : ''}

          <button class="btn btn-warning" @click=${this.handleExport} ?disabled=${!this.treeReady || this.checkedIds.size === 0}>
            ${this.exporting ? this.t('BM_EXPORTING') : this.t('BM_BUTTON_EXPORT')}
          </button>
        </div>

        ${this.errorMessage ? html`<div class="message message-error">${this.errorMessage}</div>` : ''}
        ${this.dedupeMessage ? html`<div class="message message-success">${this.dedupeMessage}</div>` : ''}
        ${this.exportMessage ? html`<div class="message message-success">${this.exportMessage}</div>` : ''}

        ${stats ? html`
          <div class="status-bar">
            <span class="status-item">${this.t('BM_STAT_GROUPS')}: <b>${stats.folders}</b></span>
            <span class="status-item">${this.t('BM_STAT_LINKS')}: <b>${stats.links}</b></span>
            <span class="status-item">${this.t('BM_STAT_CHECKED')}: <b>${stats.checked}</b></span>
            <span class="status-item">${this.t('BM_STAT_ICONS')}: <b>${stats.iconCount}</b></span>
            ${this.faviconState && this.faviconState.total > 0 ? html`
              <span class="status-item favicon-progress">
                ${this.t('BM_FAVICON_DOWNLOADING')}: ${this.faviconState.done}/${this.faviconState.total}
                (${this.t('BM_FAVICON_SUCCESS')} ${this.faviconState.success})
                <span class="bar"><span class="bar-inner" style="width:${(this.faviconState.done / this.faviconState.total * 100).toFixed(0)}%"></span></span>
              </span>
            ` : ''}
          </div>
        ` : ''}

        ${this.treeReady ? html`
          <div class="tree-actions">
            <a @click=${this.selectAll}>${this.t('BM_SELECT_ALL')}</a>
            <a @click=${this.clearAll}>${this.t('BM_CLEAR_ALL')}</a>
          </div>
          <div class="tree-container">
            ${this.tree.length ? this.tree.map(node => this.renderTreeNode(node)) : html`<div class="tree-empty">${this.t('BM_TREE_EMPTY')}</div>`}
          </div>
        ` : html`
          <div class="tree-container">
            <div class="tree-empty">${this.t('BM_TREE_HINT')}</div>
          </div>
        `}

        <div class="footer-hint">${this.t('BM_FOOTER_HINT')}</div>
      </div>

      ${this.showExportDialog ? html`
        <div class="dialog-mask" @click=${this.closeExportDialog}>
          <div class="dialog" @click=${(e) => e.stopPropagation()}>
            <h3>${this.t('BM_EXPORT_TITLE')}</h3>
            <div class="plan-option ${this.exportPlan === 'A' ? 'selected' : ''}" @click=${() => this.exportPlan = 'A'}>
              <input type="radio" name="plan" value="A" .checked=${this.exportPlan === 'A'} @change=${() => this.exportPlan = 'A'}>
              <div>
                <div class="plan-title">${this.t('BM_PLAN_A_TITLE')}</div>
                <div class="plan-desc">${this.t('BM_PLAN_A_DESC')}</div>
              </div>
            </div>
            <div class="plan-option ${this.exportPlan === 'B' ? 'selected' : ''}" @click=${() => this.exportPlan = 'B'}>
              <input type="radio" name="plan" value="B" .checked=${this.exportPlan === 'B'} @change=${() => this.exportPlan = 'B'}>
              <div>
                <div class="plan-title">${this.t('BM_PLAN_B_TITLE')}</div>
                <div class="plan-desc">${this.t('BM_PLAN_B_DESC')}</div>
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn btn-cancel" @click=${this.closeExportDialog} ?disabled=${this.exporting}>${this.t('BM_CANCEL')}</button>
              <button class="btn btn-warning" @click=${this.confirmExport} ?disabled=${this.exporting}>
                ${this.exporting ? this.t('BM_EXPORTING') : this.t('BM_CONFIRM_EXPORT')}
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  static styles = css``;
}

// ============================================================
// 辅助函数
// ============================================================

/** 统计文件夹下直接+间接链接数 */
function countLinks(children) {
  let count = 0;
  const scan = (nodes) => {
    for (const n of nodes) {
      if (n.type === 'link')
      {count++;}
      else if (n.type === 'folder')
      {scan(n.children);}
    }
  };
  scan(children);
  return count;
}

/** 生成导出文件名 SunPanel-ConfigYYYYMMDDHHmm.zip */
function formatZipFileName(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `SunPanel-Config${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}.zip`;
}

/** Blob 转 data URL */
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}
