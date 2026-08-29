// 临时脚本：统计书签文件文件夹树结构与链接数
import fs from 'fs';

const text = fs.readFileSync(new URL('../favorites_2026_8_29.html', import.meta.url), 'utf8');
const lines = text.split('\n');
const root = { title: 'ROOT', children: [] };
const stack2 = [{ indent: -1, node: root }];

for (const line of lines) {
  const m = line.match(/^(\s*)<DT><(H3|A)\b([^>]*)>/);
  if (!m) continue;
  const indent = m[1].length;
  const tag = m[2];
  const title = tag === 'H3'
    ? (line.match(/>([^<]*)<\/H3>/) || [, '?'])[1]
    : (line.match(/>([^<]*)<\/A>/) || [, '?'])[1];
  while (stack2.length > 1 && indent <= stack2[stack2.length - 1].indent) stack2.pop();
  const parent = stack2[stack2.length - 1].node;
  if (tag === 'H3') {
    const node = { title, children: [], directLinks: 0, directFolders: 0 };
    parent.children.push(node);
    stack2.push({ indent, node });
  } else {
    parent.children.push({ title: title.slice(0, 24), link: true });
    parent.directLinks++;
  }
}

function summarize(node, depth) {
  const folders = node.children.filter((c) => !c.link);
  const links = node.children.filter((c) => c.link);
  const pad = '  '.repeat(depth);
  if (node.link) {
    console.log(pad + 'LINK: ' + node.title);
  } else {
    const sample = links.slice(0, 2).map((l) => l.title).join(' | ');
    console.log(pad + 'FOLDER: ' + node.title + '  [' + links.length + ' links, ' + folders.length + ' sub]' + (sample ? '  首链接: ' + sample : ''));
    for (const c of node.children) if (!c.link) summarize(c, depth + 1);
  }
}
summarize(root, 0);
