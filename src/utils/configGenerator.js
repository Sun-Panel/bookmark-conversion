/**
 * Sun Panel v2 配置生成器
 * 将书签树转换为 Sun Panel v2 可导入的 config.json
 * 格式与 sun-panel/src/utils/jsonImportExport/shareV2.ts 完全对齐
 */
import { md5Bytes, simpleHash } from './md5.js';
import { isValidUrl } from './bookmarkParser.js';

export const ICON_FOLDER_NAME = 'icon-images';
export const DEFAULT_GROUP_NAME = '默认';

// ============================================================
// 图标处理
// ============================================================

/**
 * 解析 data URI，返回 { mime, ext, data }
 * @param {string} dataUri 形如 data:image/png;base64,xxxx
 * @returns {{ mime: string, ext: string, data: Uint8Array }|null}
 */
export function parseDataUri(dataUri) {
  if (!dataUri || !dataUri.startsWith('data:'))
  {return null;}
  const match = dataUri.match(/^data:([^;,]*)?(;base64)?,(.*)$/s);
  if (!match)
  {return null;}
  const mime = (match[1] || 'image/png').trim().toLowerCase() || 'image/png';
  const isBase64 = !!match[2];
  const payload = match[3] || '';

  let bytes;
  if (isBase64) {
    // 移除空白
    const clean = payload.replace(/\s/g, '');
    bytes = base64ToBytes(clean);
  }
  else {
    bytes = new TextEncoder().encode(payload);
  }

  return {
    mime,
    ext: mimeToExt(mime),
    data: bytes,
  };
}

/** base64 字符串转字节数组（支持非 ASCII） */
export function base64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/** MIME 类型转文件扩展名 */
export function mimeToExt(mime) {
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/bmp': 'bmp',
  };
  return map[mime] || 'png';
}

/**
 * 解析 base64 data URI 图标，生成文件名
 * @param {string} dataUri
 * @returns {{ fileName: string, mime: string, data: Uint8Array }|null}
 */
export function resolveDataUriIcon(dataUri) {
  const parsed = parseDataUri(dataUri);
  if (!parsed)
  {return null;}
  const hash = md5Bytes(parsed.data);
  const fileName = `${hash}.${parsed.ext}`;
  return { fileName, mime: parsed.mime, data: parsed.data };
}

// ============================================================
// 文字图标（无图标时的兜底）
// ============================================================

/** 文字图标背景色板 */
const TEXT_ICON_COLORS = [
  '#1f6feb', '#8250df', '#cf222e', '#953800', '#0a3069',
  '#0550ae', '#116329', '#4a5568', '#b34700', '#2d6a4f',
  '#6d28d9', '#0e7490', '#be185d', '#b45309', '#334155',
];

/** 取标题首字符作为文字图标 */
export function getTextIconChar(title) {
  const trimmed = (title || '').trim();
  if (!trimmed)
  {return '?';}
  return Array.from(trimmed)[0].toUpperCase();
}

/** 按标题 hash 从调色板取背景色 */
export function getTextIconColor(title) {
  let hash = 0;
  const str = String(title || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TEXT_ICON_COLORS.length;
  return TEXT_ICON_COLORS[idx];
}

// ============================================================
// 链接转换
// ============================================================

/**
 * 生成 Sun Panel v2 item 结构
 * @param {Object} link 书签链接节点 { title, url }
 * @param {Object} options
 * @param {Object} options.iconInfo 图标信息 { type, src, text }
 * @param {number} options.sort 排序
 */
export function createItem(link, { iconInfo, sort = 0 } = {}) {
  const icon = {
    src: iconInfo?.src || '',
    text: iconInfo?.text || '',
    type: iconInfo?.type ?? 1,
  };
  return {
    title: link.title,
    sort,
    background: '',
    cardData: {
      icon,
      openMethod: 2,
      url: link.url,
      lanUrl: '',
      customUrls: [],
      textColor: '',
    },
    cardDataPrivate: {
      remarks: '',
    },
    cardSize: 2,
    showTitle: true,
  };
}

/**
 * 将书签链接转换为 item（自动决定图标类型）
 * - base64 图标：直接转本地文件（放入 iconFiles）
 * - URL 图标：保留 URL
 * - 无图标：文字图标
 * @param {Object} link 书签链接节点
 * @param {Map<string, Blob>} iconFiles 已收集的图标文件
 * @param {string} faviconFileName favicon 文件名（异步下载成功后传入）
 * @returns {{ item: Object, iconFileName: string }}
 */
export function linkToItem(link, { iconFiles = new Map(), faviconFileName = '' } = {}) {
  let iconInfo = { type: 1, src: '', text: getTextIconChar(link.title) };
  let iconFileName = '';

  // 1. base64 data URI 图标
  if (link.icon && link.icon.startsWith('data:')) {
    const resolved = resolveDataUriIcon(link.icon);
    if (resolved) {
      iconFileName = resolved.fileName;
      iconInfo = {
        type: 2,
        src: `${ICON_FOLDER_NAME}/${resolved.fileName}`,
        text: '',
      };
      if (!iconFiles.has(resolved.fileName)) {
        iconFiles.set(resolved.fileName, new Blob([resolved.data], { type: resolved.mime }));
      }
    }
  }
  // 2. favicon 下载成功的图标
  else if (faviconFileName) {
    iconFileName = faviconFileName;
    iconInfo = {
      type: 2,
      src: `${ICON_FOLDER_NAME}/${faviconFileName}`,
      text: '',
    };
  }
  // 3. http(s) URL 图标：保留 URL
  else if (link.icon && /^https?:\/\//i.test(link.icon)) {
    iconInfo = {
      type: 2,
      src: link.icon,
      text: '',
    };
  }
  // 4. 无图标：文字图标

  return { item: createItem(link, { iconInfo }), iconFileName };
}

// ============================================================
// 分组构建（两套方案）
// ============================================================

/**
 * 方案A「顶层分组」：仅顶层文件夹作为分组，所有层级的链接平铺到所属顶层分组
 * 无文件夹包裹的顶层链接归入「默认」分组
 * @param {Array<Object>} rootNodes 根节点
 * @returns {Array<{title: string, sort: number, nodes: Array}>}
 */
export function buildGroupsPlanA(rootNodes) {
  const groups = [];
  let sort = 0;

  for (const node of rootNodes) {
    if (node.type === 'folder') {
      const items = [];
      collectLinks(node, items);
      groups.push({ title: node.title, sort: sort++, nodes: items });
    }
  }

  // 顶层直接链接 → 默认分组
  const defaultItems = rootNodes.filter(n => n.type === 'link');
  if (defaultItems.length > 0) {
    groups.push({ title: DEFAULT_GROUP_NAME, sort: sort++, nodes: defaultItems });
  }

  return groups;
}

/**
 * 递归收集文件夹下所有层级的链接
 */
function collectLinks(folder, out) {
  for (const child of folder.children) {
    if (child.type === 'link') {
      out.push(child);
    }
    else if (child.type === 'folder') {
      collectLinks(child, out);
    }
  }
}

/**
 * 方案B「全量文件夹分组」：所有层级（含非顶层）的文件夹都提升为分组，
 * 链接归属其直接父文件夹分组；无文件夹包裹的顶层链接归入「默认」分组
 * @param {Array<Object>} rootNodes 根节点
 * @returns {Array<{title: string, sort: number, nodes: Array}>}
 */
export function buildGroupsPlanB(rootNodes) {
  const groups = [];
  let sort = 0;

  const walk = (children) => {
    for (const node of children) {
      if (node.type === 'folder') {
        // 该文件夹分组只包含直接子链接
        const directLinks = node.children.filter(c => c.type === 'link');
        groups.push({ title: node.title, sort: sort++, nodes: directLinks });
        // 递归子文件夹
        walk(node.children);
      }
    }
  };

  walk(rootNodes);

  // 顶层直接链接 → 默认分组
  const defaultItems = rootNodes.filter(n => n.type === 'link');
  if (defaultItems.length > 0) {
    groups.push({ title: DEFAULT_GROUP_NAME, sort: sort++, nodes: defaultItems });
  }

  return groups;
}

// ============================================================
// config.json 生成
// ============================================================

/**
 * 生成 Sun Panel v2 配置对象
 * @param {Array<{title: string, sort: number, nodes: Array}>} groups
 * @param {Object} options
 * @param {Map<string, Blob>} options.iconFiles 图标文件集合
 * @param {Map<string, string>} options.linkFaviconMap 链接 id → favicon 文件名
 * @returns {{ config: Object, itemCount: number, usedIconFiles: Set<string> }}
 */
export function createConfigV2(groups, { iconFiles = new Map(), linkFaviconMap = new Map() } = {}) {
  const shareGroups = [];
  let itemCount = 0;
  const usedIconFiles = new Set();

  groups.forEach((group, groupIndex) => {
    const items = [];
    group.nodes.forEach((link, linkIndex) => {
      if (link.type !== 'link')
      {return;}
      if (!isValidUrl(link.url))
      {return;}
      const faviconFileName = linkFaviconMap.get(link.id) || '';
      const { item, iconFileName } = linkToItem(link, { iconFiles, faviconFileName });
      item.sort = linkIndex;
      items.push(item);
      if (iconFileName) {
        usedIconFiles.add(iconFileName);
      }
      itemCount++;
    });
    shareGroups.push({
      title: group.title,
      sort: groupIndex,
      items,
    });
  });

  // 过滤掉没有 items 的空分组？官方允许空分组，但为了整洁，保留（title 可能重名，由用户决定）

  // 计算 md5（官方 simpleHash(JSON.stringify(groups))）
  const md5 = simpleHash(JSON.stringify(shareGroups));

  const config = {
    name: 'Sun-Panel-Config',
    version: '2.0',
    exportTime: formatDateTime(new Date()),
    appVersion: '',
    md5,
    funcConfig: {
      iconImagesPath: ICON_FOLDER_NAME,
    },
    icons: shareGroups,
  };

  return { config, itemCount, usedIconFiles };
}

/**
 * 格式化时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 格式化文件名为 SunPanel-ConfigYYYYMMDDHHmm.zip
 */
export function formatExportFileName(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `SunPanel-Config${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}.zip`;
}
