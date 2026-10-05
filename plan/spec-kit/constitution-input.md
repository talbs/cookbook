# Input for `/speckit-constitution`

Standing principles for this project. Each one came out of a decision in [../COOKBOOK-DECISIONS.md](../COOKBOOK-DECISIONS.md), noted in brackets.

## Principles

1. **Nothing requires JavaScript.** Every page is complete and usable with scripts off. A script may only add a convenience on top of something that already works. It is inline, has no dependencies, makes no network requests, and never creates content, layout or data. Each script is documented with what happens without it, and a new one needs its own decision. [D-25]

2. **Vanilla first.** Start with the smallest setup that works: the static site generator with no plugins, one stylesheet, no preprocessor. Add a tool only when a concrete need shows up, and say what the need was. [D-02, D-19]

3. **The recipe data is the source of truth.** A recipe is structured data. The table, the structured data for search engines and any future view are all generated from it. Nothing about a recipe is written twice. [D-04, D-05]

4. **A broken recipe fails the build.** Every ingredient is used exactly once and every step except the last is used exactly once. A recipe that breaks these rules stops the build with a message that names the problem. A wrong table is never published. [D-04]

5. **Tests come first for logic.** The function that turns steps into a table layout is pure logic and is written test-first. Templates and styles are verified in a browser at three widths, not by assertion alone. [build plan]

6. **Accessible by default.** Semantic HTML, one `h1`, labelled landmarks, a real data table or its full ARIA equivalent, 44px touch targets, visible keyboard focus, reduced-motion and forced-colors support. Text contrast is measured, not estimated: 4.5:1 for body text. [D-16, design reference]

7. **Performance is a budget.** One inlined stylesheet, two font files, no images to start, Lighthouse 100 in all four categories on a recipe page. A change that breaks the budget needs a reason. [D-21]

8. **Styles are token-based.** Every spacing, size, type, weight, color and timing value is a custom property named by its role, not its size. Component rules hold no raw values. Only Baseline CSS features, with a fallback when a missing feature would hide content. [D-13, D-19]

9. **One card holds one recipe.** If the card is printed or screenshotted on its own, the recipe is complete. Navigation and site controls live outside it. [D-12]

10. **Every mark means something.** Textures, dots and lines each carry one meaning. Nothing is added as decoration. [D-11]

11. **Small scope, held.** One recipe table per recipe, an index, a print style. Scaling, unit conversion, shopping lists, cook mode, search and images are out until a decision says otherwise. [D-01]

## Working agreements

- Plain language in all docs and summaries. A smart 13-year-old should follow it.
- Visual decisions are made by looking at options in a browser, not from descriptions.
- Commits are local until Brian pushes. Commit subjects are lowercase present participle ("adding plan notes").
- No code comments unless the reason is not obvious from the code.
