/**
 * favicon 获取工具（远程 URL 为主）
 *
 * 获取率优先策略（参考 sun-panel-tool 直接使用远程 URL 图标的做法）：
 *  1. 通过网络透传接口获取网页 HTML（服务端代理，不受浏览器 CORS 限制），
 *     解析 <link rel="icon"> / <link rel="apple-touch-icon"> 等真实图标地址，
 *     比死板的 /favicon.ico 更精确
 *  2. 对候选图标 URL 透传探测可达性；SVG 文本图标透传直接还原为本地文件
 *  3. PNG/ICO 二进制图标：保留远程 URL（Sun Panel 配置 type=2 直接支持），
 *     并尽力用 canvas 下载本地化（离线可用）
 *  4. 任何情况下都返回一个远程 URL（兜底 `${origin}/favicon.ico`），保证获取率
 */

/**
 * 从链接 URL 提取站点 origin（协议 + 域名）
 * @param {string} url
 * @returns {string} 如 https://www.google.com
 */
export function getSiteOrigin(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  }
  catch {
    return '';
  }
}

/**
 * 从网页 HTML 中解析声明的 favicon 链接
 * 优先级（小优先）：icon+svg > icon > shortcut icon > apple-touch-icon > mask-icon
 * @param {string} html 网页 HTML 文本
 * @param {string} baseUrl 基准 URL（用于相对路径转绝对路径）
 * @returns {string[]} 绝对 URL 列表（按优先级排序）
 */
export function parseIconLinksFromHtml(html, baseUrl) {
  if (!html) {
    return [];
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  /** @type {Map<string, number>} href -> 优先级 */
  const scores = new Map();
  const add = (href, score) => {
    if (!href || !href.trim()) {
      return;
    }
    try {
      const abs = new URL(href.trim(), baseUrl).href;
      if (!/^https?:\/\//i.test(abs)) {
        return;
      }
      const cur = scores.get(abs);
      if (cur === undefined || score < cur) {
        scores.set(abs, score);
      }
    }
    catch {
      // 非法 URL 忽略
    }
  };

  doc.querySelectorAll('link[rel]').forEach((el) => {
    const rel = (el.getAttribute('rel') || '').toLowerCase();
    const href = el.getAttribute('href') || '';
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (rel.includes('apple-touch-icon')) {
      add(href, 30);
    }
    else if (rel.includes('icon')) {
      const isSvg = type.includes('svg') || /\.svg($|\?)/i.test(href);
      add(href, isSvg ? 5 : 10);
    }
    else if (rel === 'mask-icon') {
      add(href, 40);
    }
  });

  return [...scores.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([url]) => url);
}

/**
 * 构造 favicon URL 候选列表
 * @param {string} url 站点地址（任意页面 URL 或 origin）
 * @param {string[]} [htmlIcons] HTML 解析出的真实图标地址
 * @returns {string[]} 候选地址（含 https 协议与公共服务兜底）
 */
export function buildFaviconCandidates(url, htmlIcons = []) {
  const candidates = [];
  const seen = new Set();
  const push = (c) => {
    if (!c || seen.has(c)) {
      return;
    }
    seen.add(c);
    candidates.push(c);
  };
  try {
    const u = new URL(url);
    const host = u.host;
    // 1. HTML 解析出的真实图标（最优先）
    htmlIcons.forEach(push);
    // 2. 直接根路径 favicon.ico（与原协议一致优先，兼容内网 http 站点）
    if (u.protocol === 'http:') {
      push(`http://${host}/favicon.ico`);
    }
    push(`https://${host}/favicon.ico`);
    // 3. 公共服务兜底（CORS 开放，canvas 可读取）
    push(`https://www.google.com/s2/favicons?domain=${host}&sz=64`);
    push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
  }
  catch {
    // 无效 URL
  }
  return candidates;
}

/**
 * 使用 Image + canvas 探测并下载一张图片
 * 成功返回 Blob，失败返回 null
 * @param {string} url 图片地址
 * @param {number} timeout 超时毫秒
 * @returns {Promise<Blob|null>}
 */
export function tryDownloadImage(url, timeout = 6000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;

    const finish = (result) => {
      if (done)
      {return;}
      done = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeout);

    img.onload = () => {
      try {
        // 画到 canvas 并读取像素（CORS 污染时抛错）
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          finish(null);
          return;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        ctx.getImageData(0, 0, 1, 1); // 触发 CORS 检查
        canvas.toBlob((blob) => finish(blob), 'image/png');
      }
      catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = url;
  });
}

/**
 * 通过微应用网络透传接口探测并下载一张图片
 * 服务端代理请求，不受浏览器 CORS 限制。
 *
 * 返回 { blob, reachable, contentType }：
 *  - blob: 文本类（SVG）可完整还原为 Blob；二进制（PNG/ICO）经 JSON 通道会损坏，为 null
 *  - reachable: 目标 URL 是否可达（HTTP 200）——用于二进制时的远程 URL 兜底
 *
 * @param {string} url 图片地址
 * @param {Object} spCtx 微应用上下文（含 api.network.request）
 * @param {number} timeout 超时毫秒
 * @returns {Promise<{blob: Blob|null, reachable: boolean, contentType: string}>}
 */
export async function tryDownloadFaviconViaProxy(url, spCtx, timeout = 5000) {
  if (!spCtx?.api?.network?.request) {
    return { blob: null, reachable: false, contentType: '' };
  }

  let res;
  try {
    res = await Promise.race([
      spCtx.api.network.request({
        targetUrl: url,
        method: 'GET',
        headers: { accept: 'image/*,*/*;q=0.8' },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('proxy timeout')), timeout)),
    ]);
  }
  catch {
    return { blob: null, reachable: false, contentType: '' };
  }

  if (!res) {
    return { blob: null, reachable: false, contentType: '' };
  }

  // 兼容 axios 响应结构：status / headers / data
  const status = res.status ?? res.data?.status;
  if (status !== undefined && status !== 200) {
    return { blob: null, reachable: false, contentType: '' };
  }

  const headers = res.headers || {};
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toString();
  const data = res.data;

  try {
    // 文本型 favicon（SVG 最常见）→ 直接转 data URL
    if (typeof data === 'string' && data.length > 0) {
      const trimmed = data.trim();
      const looksLikeSvg = /^<\?xml|^<svg[\s>]/i.test(trimmed) || /svg|xml/.test(contentType);
      if (looksLikeSvg) {
        const base64 = btoa(unescape(encodeURIComponent(trimmed)));
        return {
          blob: dataURLToBlob(`data:image/svg+xml;base64,${base64}`),
          reachable: true,
          contentType: 'image/svg+xml',
        };
      }
      // 其他字符串（很可能是被转码损坏的二进制）→ 可达但无法还原
      return { blob: null, reachable: true, contentType };
    }

    // 二进制型（部分主应用版本可能返回 ArrayBuffer / Blob）
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return { blob: data, reachable: true, contentType: data.type || contentType };
    }
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
      const blob = new Blob([data]);
      return { blob, reachable: true, contentType: blob.type || contentType };
    }
    if (data && ArrayBuffer.isView(data)) {
      const blob = new Blob([data]);
      return { blob, reachable: true, contentType: blob.type || contentType };
    }
  }
  catch {
    return { blob: null, reachable: false, contentType };
  }

  return { blob: null, reachable: true, contentType };
}

/**
 * 通过网络透传获取网页 HTML 文本
 * @param {string} url 页面地址
 * @param {Object} spCtx 微应用上下文
 * @param {number} timeout 超时毫秒
 * @returns {Promise<string>} HTML 文本（失败或非 HTML 返回空字符串）
 */
async function tryFetchHtmlViaProxy(url, spCtx, timeout = 6000) {
  if (!spCtx?.api?.network?.request) {
    return '';
  }
  let res;
  try {
    res = await Promise.race([
      spCtx.api.network.request({
        targetUrl: url,
        method: 'GET',
        headers: { accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('proxy timeout')), timeout)),
    ]);
  }
  catch {
    return '';
  }
  const headers = res?.headers || {};
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toString();
  if (!/^text\/html/i.test(contentType)) {
    return '';
  }
  const data = res?.data;
  if (typeof data !== 'string' || !data.trim()) {
    return '';
  }
  // 只保留头部部分（link 标签基本都在 head 内），避免超大页面拖慢解析
  const MAX_LEN = 512 * 1024;
  return data.length > MAX_LEN ? data.slice(0, MAX_LEN) : data;
}

/** data URL 转 Blob */
function dataURLToBlob(dataUrl) {
  const [meta, payload] = dataUrl.split(',');
  const mime = (meta.match(/^data:([^;]*)/) || [null, 'image/png'])[1];
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
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
 * 根据 URL / Blob 推断图片文件扩展名
 * @param {string} url 图片地址
 * @param {Blob} blob 图片数据
 * @returns {string} png | svg | ico | jpg | ...
 */
export function guessImageExt(url, blob) {
  if (blob && blob.type) {
    const ext = mimeToExt(blob.type);
    if (ext !== 'png' || /png/.test(blob.type)) {
      return ext;
    }
  }
  try {
    const path = new URL(url).pathname.toLowerCase();
    const m = path.match(/\.(png|jpe?g|gif|svg|webp|ico|bmp)(\?|$)/);
    if (m) {
      return m[1] === 'jpeg' ? 'jpg' : m[1];
    }
  }
  catch {
    // 非法 URL
  }
  return 'png';
}

/**
 * 判断某候选 URL 是否可能为图标（排除 HTML 页面误判为"可达"的情况）
 * @param {string} url
 * @param {string} contentType
 * @returns {boolean}
 */
function isLikelyIconUrl(url, contentType) {
  if (contentType && /^text\/html/i.test(contentType)) {
    return false;
  }
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(ico|png|svg|jpe?g|gif|webp|bmp)(\?|$)/.test(path)) {
      return true;
    }
  }
  catch {
    // 非法 URL
  }
  return /^image\//i.test(contentType);
}

/**
 * 解析某个站点的 favicon 地址（远程 URL 为主，本地下载尽力而为）
 *
 * 策略（获取率优先，参考 sun-panel-tool 直接使用远程 URL 的方式）：
 *  1. 透传获取网页 HTML（服务端代理，无 CORS），解析 <link rel="icon"> 真实图标地址
 *  2. 对候选（最多 3 个）透传探测可达性：
 *     - SVG 文本图标：透传直接还原为 Blob（本地化，离线可用）
 *     - PNG/ICO 二进制图标：保留远程 URL，并尽力 canvas 本地化
 *  3. 全部探测失败：仍返回最优先候选作为远程 URL（不验证，与 sun-panel-tool 一致，
 *     由 Sun Panel 显示时自行加载），保证获取率
 *
 * 返回值：
 *   - remoteUrl：远程图标 URL（Sun Panel 配置 type=2 直接支持，几乎总是存在）
 *   - blob：本地图片数据（尽力而为，可为 null；非空时优先打包为本地文件）
 *   - ext：本地图片扩展名
 *
 * @param {string} siteUrl 站点地址（链接 URL 或 origin）
 * @param {Object} [spCtx] 微应用上下文（可选，传入则启用透传能力）
 * @returns {Promise<{remoteUrl: string, blob: Blob|null, ext: string}|null>}
 *   - 正常返回对象；站点 URL 非法时返回 null（调用方退回文字图标）
 */
export async function downloadFavicon(siteUrl, spCtx) {
  const origin = getSiteOrigin(siteUrl);
  if (!origin) {
    return null;
  }

  // 1. 透传获取首页 HTML，解析真实图标地址（HTML 中声明的图标通常可达且更精确）
  let html = '';
  let htmlIcons = [];
  if (spCtx?.api?.network?.request) {
    html = await tryFetchHtmlViaProxy(`${origin}/`, spCtx);
    if (html) {
      htmlIcons = parseIconLinksFromHtml(html, origin);
    }
  }

  const candidates = buildFaviconCandidates(origin, htmlIcons);
  if (candidates.length === 0) {
    return null;
  }

  // HTML 获取失败（内网/失效站点）：快速保底远程 URL，避免逐候选长超时探测，
  // 行为与 sun-panel-tool 直接使用 `/favicon.ico` 一致
  if (!html && spCtx?.api?.network?.request) {
    const blob = await tryDownloadImage(candidates[0], 4000);
    if (blob && blob.size > 0) {
      return { remoteUrl: candidates[0], blob, ext: guessImageExt(candidates[0], blob) };
    }
    return { remoteUrl: htmlIcons[0] || `${origin}/favicon.ico`, blob: null, ext: '' };
  }

  // 2. 依次尝试候选（限制数量控制耗时）：
  //    透传探测（SVG 直接还原 / 验证可达）→ canvas 本地化（二进制）
  for (const cand of candidates.slice(0, 3)) {
    const proxy = await tryDownloadFaviconViaProxy(cand, spCtx);
    if (proxy.blob && proxy.blob.size > 0) {
      // SVG 等文本图标：透传直接还原为本地 Blob
      return { remoteUrl: cand, blob: proxy.blob, ext: guessImageExt(cand, proxy.blob) };
    }
    if (proxy.reachable && isLikelyIconUrl(cand, proxy.contentType)) {
      // 二进制图标可达：保留远程 URL，并尽力 canvas 本地化（离线可用）
      const blob = await tryDownloadImage(cand, 4000);
      if (blob && blob.size > 0) {
        return { remoteUrl: cand, blob, ext: guessImageExt(cand, blob) };
      }
      return { remoteUrl: cand, blob: null, ext: '' };
    }
    // 透传不可达：canvas 兜底尝试（浏览器端可能可加载）
    const blob = await tryDownloadImage(cand, 4000);
    if (blob && blob.size > 0) {
      return { remoteUrl: cand, blob, ext: guessImageExt(cand, blob) };
    }
  }

  // 3. 全部失败：保底返回 HTML 解析图标（页面协议一致，通常可达），
  //    否则返回与站点协议一致的 /favicon.ico（sun-panel-tool 同款策略），
  //    由 Sun Panel 显示时自行加载，保证获取率
  return { remoteUrl: htmlIcons[0] || `${origin}/favicon.ico`, blob: null, ext: '' };
}

/**
 * 并发执行任务（限并发数）
 * @param {Array<T>} items
 * @param {number} concurrency
 * @param {Function} worker 返回 Promise
 */
export async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;

  const runWorker = async (index) => {
    if (index >= items.length)
    {return;}
    try {
      results[index] = await worker(items[index], index);
    }
    catch {
      results[index] = undefined;
    }
    await runWorker(next++);
  };

  const workers = [];
  const count = Math.min(concurrency, items.length);
  for (let i = 0; i < count; i++) {
    workers.push(runWorker(next++));
  }
  await Promise.all(workers);
  return results;
}
