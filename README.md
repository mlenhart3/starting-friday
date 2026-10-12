# Starting Friday

Site for the Friday Morning Men's Group. Plain HTML, CSS, and JavaScript, hosted free with GitHub Pages. There is nothing to build or install.

## Where things live

| Path | What it is |
|---|---|
| `index.html` | Home page: next Friday, current schedule, order links, history |
| `series.html` | Full guide for one study (week-by-week questions, leader tips) |
| `data/index.json` | The list of studies shown on the site |
| `data/series/*.json` | One file per study. This is the only place you edit content. |
| `data/series/_template.json` | Copy this to start a new study |
| `assets/` | Look and feel (`style.css`) and page logic (`app.js`) |

## Start a new study

1. Copy `data/series/_template.json` to a new name, such as `data/series/next-book.json`.
2. Fill it in. Set `"status": "upcoming"` while the group is still choosing or waiting to start.
3. Add the file name (without `.json`) to `data/index.json`.
4. When the study kicks off, change its status to `"current"`. When it ends, change it to `"past"`.

Only one study should be `"current"` at a time. Studies with status `"past"` move into the history list automatically.

## Weekly edits

Open the study's JSON file and edit the text between the quotation marks: a leader's name, a question, a date. Keep the commas and quotation marks around each item. GitHub's editor will underline a typo in red before you save.

## Preview a different date

Add `?today=2026-11-14` to the page address to see how the site looks on that day.
