'use strict';

const fs = require('node:fs');
const { catalogFile, sourceStrings } = require('./i18n-common.cjs');

const language = process.argv[2];
if (!['en', 'ja'].includes(language)) throw new Error('Usage: npm run i18n:update -- en|ja');

const catalog = fs.existsSync(catalogFile) ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) : { en: {}, ja: {} };
catalog.en ||= {};
catalog.ja ||= {};
const entries = sourceStrings().filter(value => !catalog[language][value]);
const target = language === 'en' ? 'en-US' : 'ja-JP';
let cursor = 0;
let completed = 0;
let errors = 0;

async function translate(value) {
  const url = 'https://api.mymemory.translated.net/get?' + new URLSearchParams({ q: value, langpair: `zh-CN|${target}` });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (data.quotaFinished || data.responseStatus === 403) throw new Error('Translation service quota exhausted');
      if (data.responseStatus !== 200 || !data.responseData?.translatedText) throw new Error(`Translation service error ${data.responseStatus}`);
      const result = data.responseData.translatedText.replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      if (result && result !== value) return result;
      throw new Error('Translator returned unchanged source');
    } catch (error) {
      if (/quota/i.test(error.message)) throw error;
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

async function worker() {
  while (cursor < entries.length) {
    const value = entries[cursor++];
    try {
      catalog[language][value] = await translate(value);
      completed++;
      if (completed % 25 === 0) {
        fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
        console.log(`${language}: ${completed}/${entries.length}`);
      }
    } catch (error) {
      errors++;
      console.error(`Could not translate ${value.slice(0, 50)}: ${error.message}`);
      if (/quota/i.test(error.message)) break;
    }
  }
}

Promise.all(Array.from({ length: 5 }, () => worker())).then(() => {
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${language}: translated ${completed}, failed ${errors}, remaining ${sourceStrings().filter(value => !catalog[language][value]).length}`);
  if (errors) process.exitCode = 1;
});
