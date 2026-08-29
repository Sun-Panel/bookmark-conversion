/**
 * 翻译文件编译器
 * 将 locales/ 目录下的 .js 翻译文件编译为 .json 文件
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 编译翻译文件
 */
export function compileLocales() {
  const localesDir = join(__dirname, '../../locales');
  const outputDir = join(__dirname, '../../dist/locales');
  
  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // 检查 locales 目录是否存在
  if (!existsSync(localesDir)) {
    console.warn('⚠️  locales directory not found:', localesDir);
    return;
  }
  
  // 读取所有 .js 文件
  const files = readdirSync(localesDir).filter(file => file.endsWith('.js'));
  
  if (files.length === 0) {
    console.warn('⚠️  No .js files found in locales directory');
    return;
  }
  
  files.forEach(file => {
    const locale = file.replace('.js', '');
    const sourcePath = join(localesDir, file);
    
    try {
      // 读取并解析 .js 文件
      const content = readFileSync(sourcePath, 'utf-8');
      
      // 移除 export default、注释并解析对象
      const cleanContent = content
        .replace(/export\s+default\s+/, '')
        .replace(/\/\/[^\n]*/g, '')  // 移除单行注释
        .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除多行注释
        .replace(/;$/, '')
        .trim();
      
      // 使用 Function 构造函数解析（避免直接 eval）
      const translations = new Function('return ' + cleanContent)();
      
      // 编译为 JSON
      const json = JSON.stringify(translations, null, 2);
      const outputPath = join(outputDir, `${locale}.json`);
      writeFileSync(outputPath, json, 'utf-8');
      
      console.log(`✅ Compiled ${file} -> ${locale}.json`);
    } catch (error) {
      console.error(`❌ Error compiling ${file}:`, error.message);
    }
  });
}