/**
 * Netscape 书签 HTML 解析器
 * 解析浏览器导出的书签文件（Chrome / Edge / Firefox 等均为该格式）
 *
 * 书签结构：
 * <DL><p>
 *   <DT><H3 ADD_DATE="...">文件夹</H3>
 *   <DL><p>
 *     <DT><A HREF="https://...">链接</A>
 *   </DL><p>
 *   <DT><A HREF="https://...">顶层链接</A>
 * </DL><p>
 */

/**
 * 解析书签 HTML 文本，返回树形结构
 * @param {string} htmlText 书签文件内容
 * @returns {Array<Object>} 节点数组
 *  节点类型：
 *  - folder: { type: 'folder', title, attrs, children: [] }
 *  - link:   { type: 'link', title, url, icon, attrs }
 */
export function parseBookmarkHTML(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  const rootDL = doc.body.querySelector('DL');
  if (!rootDL)
  {return [];}
  return parseDL(rootDL);
}

/**
 * 解析一个 DL 元素，返回其中的节点数组
 */
function parseDL(dl) {
  const nodes = [];
  const dts = Array.from(dl.children).filter(el => el.tagName === 'DT');

  for (const dt of dts) {
    const h3 = dt.querySelector(':scope > H3');
    if (h3) {
      // 文件夹
      const nextDL = findNextDL(dt);
      nodes.push({
        type: 'folder',
        title: (h3.textContent || '').trim() || '(未命名文件夹)',
        attrs: collectAttrs(h3),
        children: nextDL ? parseDL(nextDL) : [],
      });
      continue;
    }

    const a = dt.querySelector(':scope > A');
    if (a) {
      const url = a.getAttribute('href') || '';
      nodes.push({
        type: 'link',
        title: (a.textContent || '').trim() || url || '(无标题)',
        url,
        icon: a.getAttribute('ICON') || a.getAttribute('icon') || '',
        attrs: collectAttrs(a),
      });
    }
    // 其他 DT 内容（HR 等）忽略
  }

  return nodes;
}

/**
 * 查找 DT 的文件夹内容 DL
 * HTML5 解析器会把 `<DT>` 之后跟随的 `<DL>` 插入为 DT 的子元素，
 * 某些宽松解析器（或特殊文件）则可能将其放在兄弟位置，两者都兼容。
 */
function findNextDL(dt) {
  // 优先：DT 的直接子元素（HTML5 标准行为）
  const childDL = dt.querySelector(':scope > DL');
  if (childDL)
  {return childDL;}
  // 兜底：DT 之后的兄弟 DL（宽松解析）
  let el = dt.nextElementSibling;
  while (el) {
    if (el.tagName === 'DL')
    {return el;}
    el = el.nextElementSibling;
  }
  return null;
}

/**
 * 收集元素的所有属性
 */
function collectAttrs(el) {
  const attrs = {};
  for (const attr of el.attributes) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

/**
 * 遍历树中的所有节点（先序）
 * @param {Array<Object>} nodes
 * @param {Function} callback 回调 (node, parent, path)
 */
export function walkTree(nodes, callback, parent = null, path = []) {
  nodes.forEach((node, index) => {
    const nodePath = [...path, index];
    callback(node, parent, nodePath);
    if (node.type === 'folder') {
      walkTree(node.children, callback, node, nodePath);
    }
  });
}

/**
 * 统计树中的分组数和链接数
 */
export function countTree(nodes) {
  let folders = 0;
  let links = 0;
  walkTree(nodes, (node) => {
    if (node.type === 'folder')
    {folders++;}
    else
    {links++;}
  });
  return { folders, links };
}

/**
 * 判断链接 URL 是否属于可导出的网页链接
 * 过滤 javascript: about: chrome:// data: file: 等特殊协议
 */
const INVALID_PROTOCOLS = ['javascript:', 'about:', 'chrome:', 'data:', 'file:', 'vbscript:', 'edge:', 'opera:', 'chrome-extension:', 'moz-extension:', 'blob:'];

export function isValidUrl(url) {
  if (!url)
  {return false;}
  const lower = url.trim().toLowerCase();
  for (const proto of INVALID_PROTOCOLS) {
    if (lower.startsWith(proto))
    {return false;}
  }
  // 需要包含协议且不是纯锚点
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(lower);
}
