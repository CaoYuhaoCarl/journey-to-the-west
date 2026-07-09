# Repository Guidelines

## Project Structure & Module Organization
This repository is a zero-dependency local worksheet printing app for Journey to the West quiz chapters.
`index.html` defines the UI shell, `styles.css` owns responsive and print styling, and `app.js` loads and renders quiz data.
`quiz-journey-to-the-west.md` is the runtime question bank.
`server.py` starts a local static server and opens the browser, while `start.command` is the macOS double-click launcher.
`storybook/` contains chapter PDF source assets, and `favicon.svg` provides the site icon.

## Build, Test, and Development Commands
`python3 server.py` starts the app on an available `127.0.0.1` port and opens it in the default browser.
`./start.command` runs the same flow from Finder or the terminal on macOS.
There is no build step because the app uses plain HTML, CSS, JavaScript, and the Python standard library.
After front-end edits, hard-refresh the browser if cache-busted query strings in `index.html` were not changed.

## Coding Style & Naming Conventions
Use two-space indentation in HTML, CSS, and JavaScript, matching the existing files.
Keep JavaScript in strict-mode vanilla ES syntax with `const` and `let`, small helper functions, and camelCase names.
Use kebab-case for CSS classes and custom properties, such as `.chapter-button` and `--green-soft`.
Keep Python compatible with the standard library and prefer clear function names with snake_case.
Do not manually edit generated or auto-derived files if any are introduced.

## Testing Guidelines
No automated test suite is currently configured.
Manual smoke test every change by starting the server, selecting chapters, searching by number or name, switching original and random order, clicking reshuffle, and checking print preview.
For data changes, confirm affected chapter titles match `Journey to the West N: Title` so `app.js` can parse numbers.

## Commit & Pull Request Guidelines
This checkout has no Git history available, so use concise imperative commit subjects, for example `Fix print layout for short options`.
Do not add agent co-author lines.
PRs should describe user-visible changes, list manual test steps, and include screenshots or print-preview PDFs for UI or print layout changes.
Link related issues when available and call out changes to `quiz-journey-to-the-west.md` or `storybook/` assets.

## Agent-Specific Instructions
Before creating or editing `AGENTS.md`, check that it does not already exist in the working directory.
Preserve the zero-dependency approach unless a dependency is clearly justified.
