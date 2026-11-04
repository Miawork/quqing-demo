#!/usr/bin/env node
/**
 * 把 index.html 的 css/js/图标全部内联，产出单文件可分享 demo：
 *   node tools/build-demo.mjs  →  dist/index.html（可直接发送 / 拖进 Netlify Drop）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(resolve(root, p), "utf8");

let html = read("index.html");

/* 图标 → data URI（svg 直接 utf8 编码） */
const iconDataUri = "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(read("assets/icon.svg"));
html = html.replace(/href="assets\/icon\.svg"/g, `href="${iconDataUri}"`);

/* 样式表 → <style> */
html = html.replace(
  /<link rel="stylesheet" href="(css\/[^"]+)">/g,
  (_, p) => `<style>\n${read(p)}\n</style>`
);

/* 脚本 → 内联 <script>（防 </script> 提前闭合） */
html = html.replace(
  /<script src="(js\/[^"]+)"><\/script>/g,
  (_, p) => `<script>\n${read(p).replace(/<\/script>/g, "<\\/script>")}\n</script>`
);

if (/src="js\/|href="css\/|href="assets\//.test(html)) {
  console.error("⚠ 仍有未内联的本地引用，请检查");
  process.exit(1);
}

mkdirSync(resolve(root, "dist"), { recursive: true });
writeFileSync(resolve(root, "dist/index.html"), html);
console.log(`✓ dist/index.html 已生成（${(html.length / 1024).toFixed(0)} KB）`);
