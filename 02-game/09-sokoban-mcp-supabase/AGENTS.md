# Repository Guidelines

## Project Structure & Module Organization

This repository contains a compact Vite + React Sokoban game. The app entry point is `src/main.jsx`, which currently holds the level data, game-state helpers, and React UI. Global styling and responsive layout live in `src/styles.css`. The root `index.html` mounts the app, and `dist/` contains generated build output. Keep source changes in `src/`; do not edit `dist/` by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server for local playtesting.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally after `npm run build`.

There is no configured test script yet, so use `npm run build` as the baseline verification command before submitting changes.

## Coding Style & Naming Conventions

Use modern ES modules and React function components. Match the current style: two-space indentation, single quotes, semicolons, `const` by default, and descriptive camelCase names for helpers such as `parseLevel`, `moveState`, and `posKey`. Keep React component names in PascalCase. CSS class names use lowercase kebab-case, for example `app-shell`, `game-panel`, and `top-bar`.

When adding Sokoban levels, follow the existing string-grid format in `LEVELS`: `#` for walls, `.` for goals, `$` for boxes, and `@` for the player.

## Testing Guidelines

No automated test framework is currently installed. For logic-heavy changes, prefer extracting pure helpers from `src/main.jsx` so they can be covered later with Vitest or another lightweight runner. At minimum, manually verify keyboard movement, button controls, reset behavior, level completion, and responsive layout in the Vite dev server.

## Commit & Pull Request Guidelines

Git history uses short, imperative summaries and occasional Conventional Commit prefixes, such as `refactor: 화면 비율 개선 및 반응형 디자인으로 개선` and `chore: init project`. Prefer `type: concise summary` for maintenance or behavior changes, and keep messages specific.

Pull requests should include a brief description of the gameplay or UI change, verification steps run (`npm run build`, manual browser checks), and screenshots or short recordings for visual changes. Link related issues or task notes when available.

## Security & Configuration Tips

Do not commit local environment files, editor settings, or generated dependency folders. Keep dependency changes intentional and reflected in both `package.json` and `package-lock.json`.

## Codex Rule

Additional local Codex rules are documented in `banana.md`. Follow those rules when they do not conflict with this guide.
