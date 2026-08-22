# Planner week layout

Two ways to stop the lunar planner's 7-day view running tall. The view is a
CSS grid, so every day card stretches to the tallest in its row: ten tasks on
today leaves the empty days just as tall.

- `Main.dc.html` — **Option A.** Today full width, its tasks laid out three
  abreast; the rest of the week one line per day, expanding inline.
- `OptionB.dc.html` — **Option B.** One running agenda, with consecutive empty
  days folded into a single line.

`canvas.json` lays them out. The published canvas is generated from these and
is gitignored — it carries a ~2MB bundled editor.

Nothing here is wired to the app; it is a drawing to decide against.
