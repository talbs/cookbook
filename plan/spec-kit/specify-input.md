# Input for `/speckit-specify`

What to build and why. No technology on purpose. The stack is in [plan-input.md](plan-input.md).

The three parts below can be one feature or three. See "One feature or several" in [README.md](README.md).

## The feature

Turn a personal collection of recipes into a small website where every recipe is shown as a recipe table.

A recipe table puts ingredients down the side and steps across. Each step is a box that spans exactly the ingredients it combines, so reading left to right shows what joins what, and when. The format comes from Cooking for Engineers.

## Why

- The recipes are good and worth sharing, but today they are plain text files in a code repository. They are awkward to send to someone and awkward to cook from.
- A recipe table shows the shape of a recipe at a glance: how many things come together, which can be done ahead, where the waiting is.
- It should be pleasant to use in three situations: looking it over on a desktop, following it on a phone mid-cooking, and reading off what to buy.

## Who uses it

- **The author**, who writes and edits recipes and cooks from them.
- **A friend who was sent a link**, on a phone or a laptop, who has never seen a recipe table before.

## Part 1: Recipes as structured data

- The author writes each recipe as a list of ingredients and an ordered list of steps. Each step says which ingredients or earlier steps it combines.
- Each step can also say what kind of activity it is (combining, shaping, cooking by hand, waiting, baking), how long it takes, and carry a longer note.
- A recipe also has a title, a one-sentence description, a source, a yield, total and active time, tools, and anything to prepare before starting.
- Free-form notes (variations, storage, tips) stay as ordinary prose.
- If a recipe is inconsistent (an ingredient is never used, or used twice, or a step leads nowhere), the author is told exactly what is wrong and nothing is published.

Acceptance:

- The ten existing recipes can all be expressed in the format.
- A recipe with a missing or doubly used ingredient is rejected with a message naming the ingredient.
- A recipe where two separate mixtures meet late (a cake batter and a custard) produces a correct table.
- A recipe with many steps and few ingredients produces a correct table.

## Part 2: The recipe page

Each recipe has its own page. The whole recipe sits on one card.

- **Head.** The title, total time, active time and yield, then tools and prep.
- **Table.** Ingredients as rows with quantity and name. Steps as boxes spanning their ingredients, in cooking order from left to right. An ingredient that joins late is connected to its step by a dotted line.
- **Step content.** A short instruction with its action word emphasized. A time, when there is one, in a consistent place on the box.
- **Activity at a glance.** Each step's box shows what kind of activity it is, using one rule a reader can learn: lines mean hands on, dots mean hands off, denser means heat.
- **Notes.** A step with extra detail has a small numbered marker. The notes are listed at the bottom of the card, and each marker and note link to each other.
- **Source.** Credit for where the recipe came from.

On a narrow screen the table keeps its shape. It scrolls sideways within the card while the ingredient names stay in view.

A reader can pick a step to focus on, by pointer or by keyboard. From the keyboard, arrow keys move from step to step in cooking order and Esc leaves. The other steps fade, and the ingredients that go into the chosen step stay prominent. With nothing picked, every step looks the same.

Acceptance:

- On a phone, the page itself never scrolls sideways. Only the table does.
- On a wide screen, a recipe with up to seven step columns fits without scrolling.
- Every ingredient row is the same height, whatever the steps beside it contain.
- A reader using only a keyboard can reach every link and every step, and can always see where focus is.
- A reader using a screen reader hears the ingredients as row headers and can tell which step applies to which ingredients.
- A printed page shows the complete table.
- The page is usable with no scripts running.

## Part 3: The site around it

- A home page listing every recipe, grouped by category.
- Each recipe page links back to its category.
- Search engines can read each page as a recipe: name, description, yield, times, ingredients and steps.
- A page shared in a chat or on social media shows the recipe's title and description.
- The site is published automatically when recipes change.

Acceptance:

- Adding a new recipe file makes it appear on the home page with no other change.
- A structured-data testing tool recognizes each recipe page as a recipe.

## Out of scope

Changing the number of servings. Converting units. Shopping lists across recipes. A step-by-step cooking mode or timers. Search, tags or filters. Photos. Accounts, comments or ratings. Importing recipes from other sites. More than one visual theme.

## Success

- The author prefers cooking from the site to cooking from the old text files.
- A friend who gets a link understands the table without an explanation.
- A recipe page loads fast on a phone on a slow connection.

## Reference

The visual design is settled in a browser mock. It is a reference for the plan step, not part of this specification. See the screenshots in this folder and `docs/mocks/recipe-card.html`.
