import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import Eleventy from '@11ty/eleventy';

let builtPages = [];

before(async () => {
  const eleventy = new Eleventy('.', '_site', { quietMode: true });
  builtPages = await eleventy.toJSON();
});

function listRecipePages() {
  return builtPages.filter(page => page.url.startsWith('/recipes/'));
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

test("every recipe page's JSON-LD parses and carries its ingredients and steps", () => {
  for (const page of listRecipePages()) {
    const jsonLd = readJsonLd(page);
    assert.equal(jsonLd['@type'], 'Recipe', page.url);
    assert.ok(isNonEmptyString(jsonLd.name), page.url);
    assert.ok(Array.isArray(jsonLd.recipeIngredient) && jsonLd.recipeIngredient.length > 0, page.url);
    assert.ok(Array.isArray(jsonLd.recipeInstructions) && jsonLd.recipeInstructions.length > 0, page.url);
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
  const htmlPages = builtPages.filter(page => page.outputPath.endsWith('.html'));
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
