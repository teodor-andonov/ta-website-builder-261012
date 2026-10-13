import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectPages } from '../src/render.mjs';
import { validate } from '../src/model.mjs';
import { normalizeBasePath, prefixSitePaths, prefixCssPaths } from '../src/deploy-paths.mjs';

const root='/ta-website-builder-261012/';
const sample=validate(JSON.parse(await readFile(new URL('../content/site.json', import.meta.url),'utf8')));

test('base paths are safe and predictable',()=>{
  assert.equal(normalizeBasePath('/'),'/');
  assert.equal(normalizeBasePath(root),root);
  for(const invalid of ['abc','', '/abc', '//evil/', '/foo/../', '/foo//bar/', '/space here/', '/?x/', 5])
    assert.throws(()=>normalizeBasePath(invalid));
});

test('project Pages URL transform rewrites only root-relative HTML links and image sources',()=>{
  const source='<a href="/">Home</a><a href="/work/">Work</a><img src="/assets/demo/field.svg"><link href="/site.css"><a href="#top">Jump</a><a href="https://example.com/">External</a><a href="mailto:hello@example.com">Mail</a><div data-site-route="/posts/">Here</div>';
  const expected=`<a href="${root}">Home</a><a href="${root}work/">Work</a><img src="${root}assets/demo/field.svg"><link href="${root}site.css"><a href="#top">Jump</a><a href="https://example.com/">External</a><a href="mailto:hello@example.com">Mail</a><div data-site-route="/posts/">Here</div>`;
  assert.equal(prefixSitePaths(source,root),expected);
  assert.equal(prefixSitePaths(expected,root),expected,'should be idempotent');
  assert.equal(prefixSitePaths(source,'/'),source);
});

test('CSS root URLs are prefixed without touching external/relative URLs',()=>{
  const css='.one{background:url("/assets/demo/field.svg")} .two{background:url(https://example.com/img.svg)}.three{background:url(../rel.svg)}';
  assert.equal(prefixCssPaths(css,root),`.one{background:url("${root}assets/demo/field.svg")} .two{background:url(https://example.com/img.svg)}.three{background:url(../rel.svg)}`);
});

test('every published page can be served from a GitHub Pages project base without source changes',()=>{
  const pages=collectPages(sample);
  assert.equal(pages.length,10);
  for(const page of pages){
    const transformed=prefixSitePaths(page.html,root);
    assert.ok(transformed.includes(`href="${root}site.css"`),page.route);
    assert.ok(transformed.includes(`href="${root}"`),page.route);
    assert.ok(transformed.includes('name="robots" content="noindex, nofollow"'),page.route);
    assert.doesNotMatch(transformed,/\b(?:href|src)="\/(?!ta-website-builder-261012\/)/,page.route);
  }
});