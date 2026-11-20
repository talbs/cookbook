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
    course: item.data.course,
    ingredients: listIngredientNames(item.data.recipe),
  }));
  return JSON.stringify(entries, null, 2);
}
