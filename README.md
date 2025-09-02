# Promos

[![Deploy to GitHub Pages](https://github.com/SmartNetAR/promos/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/SmartNetAR/promos/actions/workflows/deploy-pages.yml)
[![CI Tests](https://github.com/SmartNetAR/promos/actions/workflows/ci.yml/badge.svg)](https://github.com/SmartNetAR/promos/actions/workflows/ci.yml)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.1.

## CI / Deploy

This project deploys to GitHub Pages via GitHub Actions on every push to `master`.

- Workflow: `.github/workflows/deploy-pages.yml`
- Output: `dist/promos` is published to Pages automatically.
- Public URL: https://smartnetar.github.io/promos/

Notes:
- The `docs/` folder is ignored and not committed. Builds are produced in CI only.
- Data JSONs from `src/app/data` are included in the build as assets under `/data`.

Manual deploy:
- You can trigger a deploy manually from the Actions tab → “Deploy to GitHub Pages” → Run workflow.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

For local preview of the Pages build, you can run:

- `npm run build` and serve `dist/promos` with any static server.

## Local preview

Quick preview (local base href):
- Build: `npm run build`
- Serve: `npx http-server dist/promos -p 4201 -c-1`
- Open: http://localhost:4201/

Preview mirroring GitHub Pages path (/promos/):
- Build with pages base: `ng build --base-href /promos/`
- Stage under a parent folder: `mkdir -p preview && cp -r dist/promos preview/promos`
- Serve the parent: `npx http-server preview -p 4201 -c-1`
- Open: http://localhost:4201/promos/

## Running unit tests

This repo uses Jest with `jest-preset-angular` (no Chrome required).

- Run all tests:
	- `npm test`
- CI mode:
	- `npm run test:ci`

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
