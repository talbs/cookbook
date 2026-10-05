# Answers for clarifying questions

Spec Kit asks questions when a spec is vague. These are the ones it is likely to ask, with the answer we already have. Anything marked **open** has no answer yet and needs Brian.

## Already decided

**How many recipes, and will there be more?**
Ten today, in two categories (desserts, food). A few more over time. Tens, not hundreds.

**Who can add or edit recipes?**
Only the author, by editing files in the repository. No editing on the site.

**Does the site need search or filtering?**
No. A plain list grouped by category.

**Should quantities scale or convert between units?**
No. Quantities are plain text and are shown exactly as written.

**What happens when a recipe's data is wrong?**
The build fails with a message naming the ingredient or step. Nothing is published.

**What if an ingredient is used in two steps?**
It is listed twice, once per use. The format requires each ingredient to be used exactly once.

**What if a mixture is split and used in two places?**
The table cannot show that. It is described in the step text.

**How should the table behave on a phone?**
It scrolls sideways inside the card with the ingredient names pinned. It does not shrink and it does not turn into a list. Both alternatives were tried and rejected.

**Are steps numbered?**
No. Position is order. Only steps with a note get a number, and that number is the note's.

**How many kinds of step are there?**
Five: combine, shape (including prep), cook (hands on with heat), wait, bake (hands off with heat). Default is combine.

**Is there a dark mode or more than one theme?**
No. One light theme.

**Are there photos?**
No.

**Does the page need to work without JavaScript?**
Yes, completely. One small script adds arrow-key movement between steps. Everything else is HTML and CSS.

**Which browsers?**
Current versions of Chrome, Safari, Firefox and Edge. Features must be Baseline. Cosmetic features may degrade.

**What accessibility level?**
WCAG 2.1 AA as the floor: 4.5:1 text contrast, 44px targets, keyboard access, visible focus, reduced motion and forced colors honored.

**What is the performance target?**
Lighthouse 100 in all four categories on a recipe page. No script that the page depends on, one inlined stylesheet, two font files.

**Where is it hosted?**
GitHub Pages.

**What typefaces and colors?**
Atkinson Hyperlegible Next and Mono. Warm near-white paper, warm near-black ink, one red accent. Exact values are in the design reference.

## Open

- **The site's real URL.** The mock assumes `https://talbs.github.io/cookbook/`.
- **Table engine.** Table layout or CSS grid. See D-23.
- **Print.** Whether textures print, and whether the table should rotate to landscape. Nobody has printed it yet.
- **Long tools, prep and notes on a phone.** Whether they fold behind a disclosure.
- **A key for the textures.** Whether readers get one, and where.
- **The home page.** No design exists beyond "a list grouped by category".
- **Optional steps, stopping points, repeats.** Designed, not in the format or the mock.
- **Which icon style.** Regular or Light, and which icons for yield, active time and tools.
- **Palette source.** Hand-tuned values, or steps from a named palette.
- **Recipe rich results.** Likely needs an image per recipe. The site has none.
