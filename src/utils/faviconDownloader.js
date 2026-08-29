/**
 * favicon 下载工具
 * 使用 <img crossorigin="anonymous"> + canvas 探测下载 favicon
 * （不违反微应用网络规范：不用 fetch，仅用 img 标签）
 *
 * 注意：受 CORS 限制，只有返回 CORS 头的站点才能成功读取像素。
 * 失败时返回 null，由调用方退回文字图标。
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
 * 下载某个链接的 favicon（依次尝试候选地址）
 * @param {string} linkUrl
 * @returns {Promise<Blob|null>}
 */
export async function downloadFavicon(linkUrl) {
  const candidates = buildFaviconCandidates(linkUrl);
  for (const cand of candidates) {
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
