import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import Eleventy from '@11ty/eleventy';

let builtPages = [];

before(async () => {
  const eleventy = new Eleventy('.', '_site', { quietMode: true });
  builtPages = await eleventy.toJSON();
});

function listRecipePages() {
  return builtPages.filter(page => page.url.startsWith('/recipes/') && page.url.endsWith('/'));
}

function listHtmlPages() {
  return builtPages.filter(page => page.outputPath.endsWith('.html'));
}

function readJsonLd(page) {
  const match = page.content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, `${page.url} has no JSON-LD script`);
  return JSON.parse(match[1]);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

test('every recipe file becomes a page at /recipes/<file name>/', () => {
  const recipeNames = readdirSync('recipes')
    .filter(fileName => fileName.endsWith('.cook'))
    .map(fileName => fileName.replace(/\.cook$/, ''));
  assert.ok(recipeNames.length > 0);

  const builtUrls = builtPages.map(page => page.url);
  for (const recipeName of recipeNames) {
    assert.ok(builtUrls.includes(`/recipes/${recipeName}/`), `no page at /recipes/${recipeName}/`);
  }
  assert.equal(listRecipePages().length, recipeNames.length);
});

test('the home page links to every recipe page', () => {
  const homePage = builtPages.find(page => page.url === '/');
  for (const page of listRecipePages()) {
    assert.ok(homePage.content.includes(`href="${page.url}"`), `the home page has no link to ${page.url}`);
  }
});

test('every recipe page carries search engine data that parses as a Recipe', () => {
  for (const page of listRecipePages()) {
    assert.equal(readJsonLd(page)['@type'], 'Recipe', page.url);
  }
});

test('a recipe that uses another recipe links to it, and the other one links back', () => {
  const parentUrl = '/recipes/chocolate-pot-de-creme/';
  const linkedUrl = '/recipes/oreo-cookie-crumble/';
  const parentPage = builtPages.find(page => page.url === parentUrl);
  const linkedPage = builtPages.find(page => page.url === linkedUrl);

  assert.ok(parentPage.content.includes(`href="${linkedUrl}"`), `${parentUrl} has no link to ${linkedUrl}`);
  assert.ok(linkedPage.content.includes(`href="${parentUrl}"`), `${linkedUrl} has no link to ${parentUrl}`);
});

test("every search.json entry has the documented shape", () => {
  const searchPage = builtPages.find((page) => page.url === "/search.json");
  assert.ok(searchPage, "no /search.json page");

  const entries = JSON.parse(searchPage.content);
  assert.ok(Array.isArray(entries));
  assert.equal(entries.length, listRecipePages().length);

  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry), ["url", "title", "description", "tags", "course", "ingredients"]);
    assert.ok(entry.url.startsWith("/recipes/"), entry.url);
    assert.ok(isNonEmptyString(entry.title), entry.url);
    assert.ok(isNonEmptyString(entry.description), entry.url);
    assert.ok(Array.isArray(entry.tags) && entry.tags.every((tag) => typeof tag === "string"), entry.url);
    assert.ok(Array.isArray(entry.ingredients) && entry.ingredients.length > 0, entry.url);
    assert.ok(entry.ingredients.every((name) => typeof name === "string"), entry.url);
    assert.ok(typeof entry.course === "string" || entry.course === null, entry.url);
  }
});

test('every page names its own address on the live site as canonical, except the 404', () => {
  const htmlPages = listHtmlPages();
  assert.ok(htmlPages.length > 0);
  assert.ok(htmlPages.some(page => page.url === '/404.html'), 'no page at /404.html');

  for (const page of htmlPages) {
    const match = page.content.match(/<link rel="canonical" href="([^"]*)">/);
    if (page.url === '/404.html') {
      assert.equal(match, null, 'the 404 page has a canonical link');
      continue;
    }
    assert.ok(match, `${page.url} has no canonical link`);
    assert.equal(match[1], `https://cookbook.talbs.me${page.url}`);
  }
});

test('every link to a page on this site leads to a page the build wrote', () => {
  const htmlPages = listHtmlPages();
  const builtUrls = new Set(builtPages.map(page => page.url));
  let checkedLinkCount = 0;

  for (const page of htmlPages) {
    for (const [, href] of page.content.matchAll(/href="(\/[^"]*)"/g)) {
      const address = href.split('#')[0].split('?')[0];
      if (address.startsWith('/assets/')) continue;
      assert.ok(builtUrls.has(address), `${page.url} links to ${href}, which isn't a built page`);
      checkedLinkCount += 1;
    }
  }
  assert.ok(checkedLinkCount > 0);
});

test("every recipe's source file is published unchanged as plain text, and its page points to it", () => {
  for (const page of listRecipePages()) {
    const recipeName = page.url.split('/')[2];
    const rawPage = builtPages.find(built => built.url === `/recipes/${recipeName}.txt`);
    assert.ok(rawPage, `no plain text file for ${page.url}`);
    assert.equal(rawPage.content, readFileSync(`recipes/${recipeName}.cook`, 'utf8'), recipeName);

    const match = page.content.match(/<link rel="alternate" type="text\/plain" title="Cooklang source" href="([^"]*)">/);
    assert.ok(match, `${page.url} has no alternate link`);
    assert.equal(match[1], `https://cookbook.talbs.me/recipes/${recipeName}.txt`);
  }
});
