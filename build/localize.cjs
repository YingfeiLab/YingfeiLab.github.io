'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const OpenCC = require('opencc-js');
const { publicDir, catalogFile, htmlFiles, translatableNodes, translatableAttrs, sourceStrings } = require('./i18n-common.cjs');

const translations = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, 'translation-overrides.json'), 'utf8'));
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });
const supported = ['en', 'zh-CN', 'zh-TW', 'ja'];
const labels = { en: 'Language', 'zh-CN': '语言', 'zh-TW': '語言', ja: '言語' };
const names = { en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語' };
const translatedUi = {
  en: {
    '打开搜索框': 'Open search', '关闭': 'Close', '夜间模式': 'Dark mode', '日间模式': 'Light mode'
  },
  ja: {},
  'zh-CN': {},
  'zh-TW': {}
};
const sourceFiles = htmlFiles();
const originals = new Map(sourceFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));

for (const language of ['en', 'ja']) {
  const missing = sourceStrings().filter(value => !(overrides[language][value] || translations[language][value]));
  if (missing.length) throw new Error(`Missing ${language} translations: ${missing.slice(0, 6).join(' | ')}`);
}

function localizeText(value, language) {
  if (language === 'zh-CN') return value;
  if (language === 'zh-TW') return toTraditional(value);
  const leading = value.match(/^\s*/)[0];
  const trailing = value.match(/\s*$/)[0];
  const key = value.trim();
  return leading + (overrides[language][key] || translations[language][key] || translatedUi[language][key] || key) + trailing;
}

function localUrl(pathname, language) {
  return language === 'en' ? pathname : `/${language}${pathname}`;
}

function addLanguageMenu(document, language, originalPath) {
  const desktop = document.querySelector('#navbar .navbar-nav');
  const mobile = document.querySelector('#mobile-grid-menu .row');
  if (!desktop || !mobile) throw new Error(`Fluid navigation not found in ${originalPath}`);
  for (const existing of desktop.querySelectorAll('.language-menu')) existing.remove();
  for (const existing of mobile.querySelectorAll('.language-option,.mobile-grid-group-header')) existing.remove();

  const dropdown = document.createElement('li');
  dropdown.className = 'nav-item dropdown language-menu';
  const toggle = document.createElement('a');
  toggle.className = 'nav-link dropdown-toggle';
  toggle.href = 'javascript:;';
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('data-toggle', 'dropdown');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', labels[language]);
  toggle.textContent = `${labels[language]} `;
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.className = 'language-globe';
  icon.textContent = '🌐';
  toggle.prepend(icon);
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  for (const code of supported) {
    const link = document.createElement('a');
    link.className = 'dropdown-item';
    link.href = localUrl(originalPath, code);
    link.lang = code;
    link.textContent = names[code];
    if (code === language) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    menu.append(link);
  }
  dropdown.append(toggle, menu);
  desktop.insertBefore(dropdown, desktop.querySelector('#search-btn'));

  const group = document.createElement('div');
  group.className = 'col-12 mobile-grid-group-header';
  group.textContent = labels[language];
  mobile.append(group);
  for (const code of supported) {
    const cell = document.createElement('div');
    cell.className = 'col-6 mobile-grid-cell language-option';
    const link = document.createElement('a');
    link.href = localUrl(originalPath, code);
    link.lang = code;
    link.textContent = names[code];
    if (code === language) link.setAttribute('aria-current', 'page');
    cell.append(link);
    mobile.append(cell);
  }
}

function rewritePageLinks(document, language) {
  if (language === 'en') return;
  for (const anchor of document.querySelectorAll('a[href^="/"]')) {
    const href = anchor.getAttribute('href');
    if (href.startsWith('/' + language + '/')) continue;
    anchor.setAttribute('href', localUrl(href, language));
  }
}

function showContentAddressesAsText(document) {
  for (const anchor of document.querySelectorAll('.markdown-body a[href], .page-content a[href]')) {
    const href = anchor.getAttribute('href');
    if (/^https?:\/\//i.test(href)) {
      anchor.replaceWith(document.createTextNode(href));
    } else if (/^mailto:/i.test(href)) {
      anchor.replaceWith(document.createTextNode(href.slice(7)));
    }
  }
}

function localizePage(sourceHtml, language, originalPath) {
  const dom = new JSDOM(sourceHtml);
  const { document } = dom.window;
  document.documentElement.lang = language;
  for (const { node, value } of translatableNodes(document)) {
    const result = localizeText(value, language);
    const start = node.nodeValue.indexOf(value);
    node.nodeValue = node.nodeValue.slice(0, start) + result.trim() + node.nodeValue.slice(start + value.length);
  }
  for (const { element, name, value } of translatableAttrs(document)) {
    element.setAttribute(name, localizeText(value, language).trim());
  }
  const articleTitle = document.querySelector('#seo-header')?.textContent.trim();
  if (articleTitle) {
    document.title = `${articleTitle} - Yingfei Lab`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = articleTitle;
  }
  rewritePageLinks(document, language);
  addLanguageMenu(document, language, originalPath);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `https://yingfeilab.github.io${localUrl(originalPath, language)}`;
  for (const meta of document.querySelectorAll('meta[property="og:url"]')) {
    meta.content = `https://yingfeilab.github.io${localUrl(originalPath, language)}`;
  }
  for (const meta of document.querySelectorAll('meta[property="og:locale"]')) {
    meta.content = ({ en: 'en_US', 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', ja: 'ja_JP' })[language];
  }
  for (const code of supported) {
    const alternate = document.createElement('link');
    alternate.rel = 'alternate';
    alternate.hreflang = code;
    alternate.href = `https://yingfeilab.github.io${localUrl(originalPath, code)}`;
    document.head.append(alternate);
  }
  const configScript = [...document.scripts].find(script => script.textContent.includes('var CONFIG ='));
  if (configScript && language !== 'en') {
    configScript.textContent = configScript.textContent.replace('"search_path":"/local-search.xml"', `"search_path":"/${language}/local-search.xml"`);
  }
  for (const anchor of document.querySelectorAll('.tailscale-guide a[href^="/"],.markdown-body a[href^="/"]')) {
    if (language !== 'en' && !anchor.getAttribute('href').startsWith(`/${language}/`)) {
      anchor.setAttribute('href', localUrl(anchor.getAttribute('href'), language));
    }
  }
  showContentAddressesAsText(document);
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function writeSearchXml(language) {
  const postFiles = sourceFiles.filter(file => path.relative(publicDir, file).replaceAll('\\', '/').startsWith('posts/'));
  const entries = postFiles.map(sourceFile => {
    const relative = path.relative(publicDir, sourceFile);
    const postPath = '/' + relative.replaceAll('\\', '/').replace(/index\.html$/, '');
    const url = localUrl(postPath, language);
    const file = path.join(publicDir, language === 'en' ? '' : language, relative);
    const document = new JSDOM(fs.readFileSync(file, 'utf8')).window.document;
    const title = document.querySelector('#seo-header')?.textContent.trim() || document.title;
    const content = document.querySelector('.post-content .markdown-body')?.textContent.trim() || '';
    return `  <entry><title>${escapeXml(title)}</title><url>${escapeXml(url)}</url><content type="text">${escapeXml(content)}</content></entry>`;
  });
  const directory = path.join(publicDir, language === 'en' ? '' : language);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'local-search.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<search>\n${entries.join('\n')}\n</search>\n`);
}

for (const language of supported) {
  for (const [sourceFile, originalHtml] of originals) {
    const relative = path.relative(publicDir, sourceFile).replaceAll('\\', '/');
    const originalPath = relative === 'index.html' ? '/' : relative === '404.html' ? '/404.html' : '/' + relative.replace(/index\.html$/, '');
    const destination = path.join(publicDir, language === 'en' ? '' : language, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, localizePage(originalHtml, language, originalPath));
  }
  writeSearchXml(language);
  console.log(`Localized ${sourceFiles.length} pages: ${language}`);
}
