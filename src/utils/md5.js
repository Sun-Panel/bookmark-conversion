/**
 * MD5 工具函数
 * 用于图标文件内容命名（内容 MD5）以及 Sun Panel 配置的 simpleHash 校验值
 */

// ============================================================
// 标准 MD5 实现（RFC 1321）
// ============================================================

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = [];
for (let i = 0; i < 64; i++) {
  // 计算 floor(abs(sin(i+1)) * 2^32)
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
}

function rotl(x, c) {
  return (x << c) | (x >>> (32 - c));
}

function toBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0x7f) {
      // UTF-8 编码（支持中文）
      if (code > 0x7ff) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
      else {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      }
    }
    else {
      bytes.push(code);
    }
  }
  return bytes;
}

function bytesToWords(bytes) {
  const words = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      bytes[i]
      | (bytes[i + 1] << 8)
      | (bytes[i + 2] << 16)
      | (bytes[i + 3] << 24),
    );
  }
  return words;
}

/**
 * 计算字符串的 MD5 哈希（32 位小写 hex）
 * @param {string} input 输入字符串
 * @returns {string} 32 位 hex
 */
export function md5(input) {
  const bytes = toBytes(String(input));
  const bitLen = bytes.length * 8;
  // padding: 0x80 + 0x00... + 64bit length
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00);
  }
  // 追加长度（小端 64 位）
  // 注意：JS 位移操作符对移位量取模 32，不能直接用 bitLen >>> (i*8) 处理 i>=4 的情况
  const lenLo = bitLen % 0x100000000;
  const lenHi = Math.floor(bitLen / 0x100000000);
  const lenBytes = [];
  for (let i = 0; i < 4; i++) {
    lenBytes.push((lenLo >>> (i * 8)) & 0xff);
  }
  for (let i = 0; i < 4; i++) {
    lenBytes.push((lenHi >>> (i * 8)) & 0xff);
  }
  bytes.push(...lenBytes);

  const words = bytesToWords(bytes);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < words.length; i += 16) {
    const M = words.slice(i, i + 16);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let j = 0; j < 64; j++) {
      let F;
      let g;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      }
      else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      }
      else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      }
      else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }

      F = (F + A + K[j] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[j])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  // 输出小端 hex
  const result = [];
  const vals = [a0, b0, c0, d0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result.push((vals[i] >>> (j * 8)) & 0xff);
    }
  }
  return result.map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * 计算字节数组的 MD5（用于图标文件内容命名）
 * @param {Uint8Array|number[]} data 字节数据
 * @returns {string} 32 位 hex
 */
export function md5Bytes(data) {
  const bytes = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data[i] & 0xff);
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00);
  }
  const lenLo = bitLen % 0x100000000;
  const lenHi = Math.floor(bitLen / 0x100000000);
  const lenBytes = [];
  for (let i = 0; i < 4; i++) {
    lenBytes.push((lenLo >>> (i * 8)) & 0xff);
  }
  for (let i = 0; i < 4; i++) {
    lenBytes.push((lenHi >>> (i * 8)) & 0xff);
  }
  bytes.push(...lenBytes);

  const words = bytesToWords(bytes);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < words.length; i += 16) {
    const M = words.slice(i, i + 16);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let j = 0; j < 64; j++) {
      let F;
      let g;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      }
      else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      }
      else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      }
      else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }

      F = (F + A + K[j] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[j])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const result = [];
  const vals = [a0, b0, c0, d0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result.push((vals[i] >>> (j * 8)) & 0xff);
    }
  }
  return result.map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Sun Panel 官方 simpleHash 校验算法（与 shareV2.ts 完全一致）
 * 用于生成 config.json 中的 md5 字段
 * @param {string} str 待校验字符串（JSON.stringify(groups)）
 * @returns {string} 8 位 hex
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
