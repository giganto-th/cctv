// รวมต้นแบบเป็นไฟล์ HTML เดียว (dist/tathip.html) สำหรับแชร์หรือเผยแพร่เป็น Artifact
//   --fragment  ตัด <!doctype>/<html>/<head>/<body> ออก (ให้แพลตฟอร์มห่อให้เอง)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'prototype');
const fragment = process.argv.includes('--fragment');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => `<style>\n${fs.readFileSync(path.join(src, f), 'utf8')}\n</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => `<script>\n${fs.readFileSync(path.join(src, f), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);

if (fragment) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', fragment ? 'tathip-fragment.html' : 'tathip.html');
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)} ${(html.length / 1024).toFixed(0)} KB`);
