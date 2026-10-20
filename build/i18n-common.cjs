'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, '..', 'public');
const catalogFile = path.join(__dirname, 'translations.json');
const languageCodes = ['en', 'zh-CN', 'zh-TW', 'ja'];
const translatableAttributes = ['alt', 'title', 'aria-label', 'placeholder', 'content', 'data-typed-text'];
const chinese = /[\u3400-\u9fff]/;

function htmlFiles(dir = publicDir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'zh-CN' || entry.name === 'zh-TW' || entry.name === 'ja') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(absolute));
    else if (entry.name.endsWith('.html')) found.push(absolute);
  }
  return found;
}

function translatableNodes(document) {
  const nodes = [];
  const walker = document.createTreeWalker(document, 4);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.nodeValue.trim();
    if (chinese.test(value) && !node.parentElement?.closest('script,style,pre,code,noscript,.language-menu,.mobile-grid-group-header,.language-option')) {
      nodes.push({ node, value });
    }
  }
  return nodes;
}

function translatableAttrs(document) {
  const attrs = [];
  for (const element of document.querySelectorAll('*')) {
    if (element.closest('script,style,pre,code,noscript,.language-menu,.mobile-grid-group-header,.language-option')) continue;
    for (const name of translatableAttributes) {
      if (name === 'content' && element.tagName !== 'META') continue;
      const value = element.getAttribute(name)?.trim();
      if (value && chinese.test(value) && !(name === 'content' && /^https?:\/\//.test(value))) attrs.push({ element, name, value });
    }
  }
  return attrs;
}

function sourceStrings() {
  const values = new Set();
  for (const file of htmlFiles()) {
    const document = new JSDOM(fs.readFileSync(file, 'utf8')).window.document;
    for (const { value } of translatableNodes(document)) values.add(value);
    for (const { value } of translatableAttrs(document)) values.add(value);
  }
  return [...values];
}

module.exports = { publicDir, catalogFile, languageCodes, chinese, htmlFiles, translatableNodes, translatableAttrs, sourceStrings };
