export function data() {
  return { permalink: '/search.json', eleventyExcludeFromCollections: true };
}

function listIngredientNames(recipe) {
  return [...new Set(recipe.ingredients.map(ingredient => ingredient.name))];
}

export function render({ collections }) {
  const entries = collections.recipes.map(item => ({
    url: item.url,
    title: item.data.title,
    description: item.data.description,
    tags: item.data.tags,
    seasons: this.seasonTags(item.data.tags),
    course: item.data.course,
    ingredients: listIngredientNames(item.data.recipe),
    time: item.data.timeLabel ?? null,
    icon: item.data.icons?.[0] ?? null,
  }));
  return JSON.stringify(entries);
}
