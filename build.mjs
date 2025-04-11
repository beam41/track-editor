import * as esbuild from 'esbuild';
import { load } from 'cheerio';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'fs';

const result = await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  platform: 'browser',
  tsconfig: './tsconfig.json',
  treeShaking: true,
  write: false,
  external: ['three'],
  format: 'esm',
});

const resultCss = await esbuild.build({
  entryPoints: ['./src/index.css'],
  minify: true,
  write: false,
});

const html = readFileSync('./src/index.html', 'utf8');
const $ = load(html);

result.outputFiles.forEach((out) => {
  $('body').append(`<script type="module">${out.text}</script>`);
});

resultCss.outputFiles.forEach((out) => {
  $('head').append(`<style>${out.text}</style>`);
});

if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true });
}

mkdirSync('./dist');
writeFileSync('./dist/track-editor.html', $.html(), 'utf8');
copyFileSync('./src/map.png', './dist/map.png');
