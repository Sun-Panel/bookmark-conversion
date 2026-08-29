/**
 * favicon 下载工具
 *
 * 下载策略（多层降级）：
 *  1. 微应用透传接口 spCtx.api.network.request 代理下载（服务端请求，不受浏览器 CORS 限制）
 *     - 对 SVG/XML/文本类 favicon 可直接获得完整字符串并转 data URL
 *     - 对 PNG/ICO 等二进制，主应用以 JSON 模式接收会损坏数据，透传主要用于探测可达性
 *  2. <img crossorigin="anonymous"> + canvas 下载（受 CORS 限制，能成功则返回 PNG Blob）
 *  3. 失败返回 null，由调用方退回文字图标
 */

/**
 * 从链接 URL 提取域名
 * @param {string} url
 * @returns {string} 如 https://www.google.com（仅协议+域名）
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
 * 构造 favicon URL 候选列表
 * @param {string} url
 * @returns {string[]} 候选地址（含 https 协议）
 */
export function buildFaviconCandidates(url) {
  const candidates = [];
  try {
    const u = new URL(url);
    // 直接根路径 favicon.ico（https 优先）
    candidates.push(`https://${u.host}/favicon.ico`);
    if (u.protocol === 'http:') {
      candidates.push(`http://${u.host}/favicon.ico`);
    }
    // 网页内声明的 icon（需解析 HTML，此处省略）
  }
  catch {
    // 无效 URL
  }
  return candidates;
}

/**
 * 使用 Image + canvas 探测并下载一张图片
 * 成功返回 Blob（PNG 格式），失败返回 null
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
 * 通过微应用透传接口下载 favicon
 * 使用 spCtx.api.network.request 代理外部请求（服务端代理，不受浏览器 CORS 限制）
 *
 * @param {string} url 图片地址
 * @param {Object} spCtx 微应用上下文（含 api.network.request）
 * @param {number} timeout 超时毫秒（微应用侧超时，此处仅作兜底计时）
 * @returns {Promise<Blob|null>}
 */
export async function tryDownloadFaviconViaProxy(url, spCtx, timeout = 8000) {
  if (!spCtx?.api?.network?.request) {
    return null;
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
    return null;
  }

  if (!res) {
    return null;
  }

  // 兼容 axios 响应结构：status / headers / data
  const status = res.status ?? res.data?.status;
  if (status !== undefined && status !== 200) {
    return null;
  }

  const headers = res.headers || {};
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toString();
  const data = res.data;

  try {
    // 文本型 favicon（SVG 最常见）→ 直接转 data URL
    if (typeof data === 'string' && data.length > 0) {
      const trimmed = data.trim();
      const looksLikeSvg = /^<svg[\s>]/i.test(trimmed) || /svg|xml/.test(contentType);
      if (looksLikeSvg) {
        const base64 = btoa(unescape(encodeURIComponent(trimmed)));
        return dataURLToBlob(`data:image/svg+xml;base64,${base64}`);
      }
      // 其他字符串（很可能是被转码损坏的二进制）→ 无法使用
      return null;
    }

    // 二进制型（部分主应用版本可能返回 ArrayBuffer / Blob）
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data;
    }
    if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
      return new Blob([data]);
    }
    if (data && ArrayBuffer.isView(data)) {
      return new Blob([data]);
    }
  }
  catch {
    return null;
  }

  return null;
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

/**
 * 下载某个链接的 favicon（依次尝试候选地址）
 * 策略：先透传接口（服务端代理，无 CORS 限制，SVG 文本类可直接获取），再 canvas 下载
 * @param {string} linkUrl
 * @param {Object} [spCtx] 微应用上下文（可选，传入则启用透传下载）
 * @returns {Promise<Blob|null>}
 */
export async function downloadFavicon(linkUrl, spCtx) {
  const candidates = buildFaviconCandidates(linkUrl);
  for (const cand of candidates) {
    // 1. 透传接口下载（服务端代理，不受 CORS 限制）
    const proxyBlob = await tryDownloadFaviconViaProxy(cand, spCtx);
    if (proxyBlob && proxyBlob.size > 0) {
      return proxyBlob;
    }
    // 2. canvas 下载（CORS 允许时成功）
    const blob = await tryDownloadImage(cand, 5000);
    if (blob && blob.size > 0) {
      return blob;
    }
  }
  return null;
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
