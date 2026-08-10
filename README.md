<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logos/canon-lockup-dark.png" height="29">
    <source media="(prefers-color-scheme: light)" srcset="./public/logos/canon-lockup-light.png" height="29">
    <img src="./public/logos/canon-lockup-light.png" height="29" alt="Canon" />
  </picture>
</p>
<p align="center">
  <i>A fast, collaborative knowledge base for your team, built with React and Node.js.</i>
</p>
<p align="center">
  <a href="http://www.typescriptlang.org" rel="nofollow"><img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" alt="TypeScript"></a>
  <a href="https://github.com/styled-components/styled-components"><img src="https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg" alt="Styled Components"></a>
</p>

## Canon is a fork of Outline

Canon is an opinionated fork of [Outline](https://github.com/outline/outline), the
knowledge base built by General Outline, Inc. Outline is the upstream project and
does all the heavy lifting; Canon changes how it looks and trims it down to the
way we want to run it.

**This fork is not affiliated with, endorsed by, or supported by the Outline
project.** Please do not report Canon problems to them. If you want Outline
itself, go to [outline/outline](https://github.com/outline/outline) or the hosted
service at [getoutline.com](https://www.getoutline.com) — both are better choices
than this fork unless you specifically want our changes.

Canon regularly merges changes from upstream. Where our changes and upstream's
disagree, ours win, except for bug fixes and security fixes, which we always take.

### What is different here

- Rebranded as Canon, with per-workspace logos on the sidebar, sign-in screen and
  email header.
- Reworked document typography: heading rhythm and scale, section rules, uppercase
  overline headings, rebuilt blockquotes, and larger checklist controls.
- Rebuilt sidebar: collapsed sections become navigation rows, shallower
  indentation, an active-row accent, a drafts count, and a pinned footer.
- Redesigned home screen, document lists and editor chrome.
- Admin-configurable typography, text sizes and accent palettes, gated on a 4.5:1
  contrast check.
- Document freshness tracking, so a document can be marked verified and flagged
  when it goes stale.
- Bare URLs in document text render as real links.
- Built and run as a single self-hosted workspace. Upstream's hosted-service
  paths (subdomain routing, workspace creation) stay in the code but are
  permanently inactive, since they key off Outline's own cloud URLs.
- Nothing phones home. The usage-statistics reporter is removed outright rather
  than left behind a flag, and every outbound help link is an opt-in environment
  variable with no default.

## Installation

Container images are published to the GitHub Container Registry:

```shell
docker pull ghcr.io/dreuse/canon:latest
```

Images are built for `linux/amd64` only. On an arm64 machine, such as an Apple
Silicon Mac, add `--platform linux/amd64` to `docker pull` and `docker run`; it
will work under emulation.

Canon needs PostgreSQL and Redis. `docker-compose.yml` in this repository brings
both up for local use, and `.env.sample` documents every supported setting —
start there and set at least `URL`, `SECRET_KEY`, `UTILS_SECRET`, `DATABASE_URL`
and `REDIS_URL`.

The runtime, environment variables and deployment shape are unchanged from
upstream, so Outline's [self-hosting documentation](https://docs.getoutline.com/s/hosting/)
applies to Canon too. Substitute the image name above for theirs.

## Development

Requires Node.js 26 (see `.nvmrc`) and Yarn.

```shell
yarn install
yarn dev
```

The [architecture document](docs/ARCHITECTURE.md) is a good high level overview of
how the application fits together.

### Debugging

In development Canon writes plain, category-prefixed logs to the console. In
production it writes JSON.

HTTP logging is off by default; enable it with `DEBUG=http`. Use `DEBUG=*` for all
categories, or a single one such as `DEBUG=database`. `LOG_LEVEL=debug` and
`LOG_LEVEL=silly` increase verbosity.

### Tests

Tests live next to the code they cover in `.test.ts` files and run under
[Vitest](https://vitest.dev/).

```shell
yarn test path/to/file.test.ts   # a single file, the usual case
yarn test:app                    # frontend
yarn test:shared                 # shared code
yarn test:server                 # backend
```

The backend suite needs its own database. Create it once, then migrate it:

```shell
createdb outline-test
NODE_ENV=test yarn sequelize db:migrate
```

If PostgreSQL is running through `docker-compose.yml`, create it inside the
container instead, using the credentials from that file:

```shell
docker compose exec postgres psql -U user -d postgres -c 'CREATE DATABASE "outline-test" OWNER "user";'
NODE_ENV=test yarn sequelize db:migrate
```

`DATABASE_URL` for tests comes from `.env.test`.

### Migrations

Sequelize handles migrations:

```shell
yarn db:create-migration --name my-migration
yarn db:migrate
yarn db:rollback
```

## License

Canon is a modified version of Outline and is distributed under the same licence:
the [Business Source License 1.1](LICENSE), with General Outline, Inc. as
licensor. The licence permits use, modification and redistribution, but not
running the work as a "Document Service" — a commercial offering that lets third
parties create their own teams and documents. On 2030-07-13 the licence converts
to Apache License 2.0.

The licence grants no rights in the Outline name or logo, which is why this fork
carries its own. "Outline" is referred to here only to credit the upstream project.
