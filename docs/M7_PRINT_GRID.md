# M7 — Print-native Card/Object graphic system

Confirmed intent: one presentation/print-like fixed composition rendered consistently across page widths, **not** a conventional responsive layout.

## Model
- **Card** = equal CSS Grid with integer `columns` and `rows`. Cards can contain Cards and single-payload Objects.
- Each direct child occupies a zero-ambiguity 1-indexed **grid rectangle** `area:{x1,y1,x2,y2}`. Starts are inclusive, ends exclusive. A 2×2 Card child occupying the left column is `{x1:1,y1:1,x2:2,y2:3}`.
- The Page is a master Card with stacked section Cards. Header/nav and footer are semantic Grid Cards and keep their website navigation roles.
- **Height constraint:** a Card with `constrainHeight:true` sets `aspect-ratio:1 / heightFactor`, i.e. height = its own width × heightFactor. With `false`, grid rows use content heights. Intended especially for stacked Page section Cards.
- No breakpoints or automatic number-of-columns changes. Children retain their cells at every screen size; overflow within a grid item is scrollable but scrollbars are visually hidden.
- **Page unit** 1u = page width / 100 via 1cqw. All layout spacing, typographic sizes, padding, radii and heights are based on page width.
- Card backgrounds: `transparent,white,grey-100,grey-200,grey-300,grey-600,black`. No saturated colors.
- Gaps and padding: `none(0u), compact(1u), regular(2u), generous(3u)`; choose deliberately and consistently.
- Optional `border` per Card. Site-wide `site.design.cardBorders` enables subtle borders for every Card, including transparent grouping Cards.

## Authoring
The desktop Studio inspector edits the selected Card's grid divisions, background, gap, padding, border, height toggle/factor. A child shows x1,y1,x2,y2 fields. New Card children receive the next free cell, extending row count if needed. Decreasing rows/columns that would strand a child is blocked. The root Add action wraps atomic objects in a 1×1 section Card.

## Compatibility and acceptance
The canonical content was migrated and remains JSON-only. The renderer tolerates legacy cards for older handoffs, while model validation enforces strong geometry on new cards with grid fields. Existing project/post datasets and URLs remain unchanged. The public website remains noindex while sample content is unapproved.

This is a deliberate trade-off: text and links on very narrow screens can become tiny. Users may zoom, just as with a printed layout. The site does not invent mobile breakpoints to compensate. Preview at wide and narrow widths to verify **same composition and cell coordinates**, not mobile reflow.
