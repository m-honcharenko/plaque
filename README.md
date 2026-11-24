# Plaque: adaptive SVG badges for READMEs

Badges for README files that adapt to the reader's screen. [Make your own in the builder](https://plaque-ziwx.onrender.com/builder).

<p>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/badge?label=runtime&amp;value=Bun&amp;color=neutral&amp;icon=bun&amp;theme=auto&amp;layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/badge?label=runtime&amp;value=Bun&amp;color=neutral&amp;icon=bun&amp;theme=auto&amp;layout=full" alt="runtime: Bun">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/badge?label=framework&amp;value=NestJS&amp;color=neutral&amp;icon=nestjs&amp;theme=auto&amp;layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/badge?label=framework&amp;value=NestJS&amp;color=neutral&amp;icon=nestjs&amp;theme=auto&amp;layout=full" alt="framework: NestJS">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/badge?label=language&amp;value=TypeScript&amp;color=info&amp;icon=typescript&amp;theme=auto&amp;layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/badge?label=language&amp;value=TypeScript&amp;color=info&amp;icon=typescript&amp;theme=auto&amp;layout=full" alt="language: TypeScript">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/badge?label=hosted+on&amp;value=Render&amp;color=neutral&amp;icon=rocket&amp;theme=auto&amp;layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/badge?label=hosted+on&amp;value=Render&amp;color=neutral&amp;icon=rocket&amp;theme=auto&amp;layout=full" alt="hosted on: Render">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/ci?layout=compact">
    <img align="middle" src="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/ci?layout=full" alt="build">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/stars?layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/stars?layout=full" alt="stars">
  </picture>
  <picture>
    <source media="(max-width: 600px)" srcset="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/license?layout=vertical">
    <img align="middle" src="https://plaque-ziwx.onrender.com/gh/m-honcharenko/plaque/license?layout=full" alt="license">
  </picture>
</p>

Resize the window: on a narrow screen each badge above stacks its icon over
the value. A status such as `passing` collapses to an icon alone instead
(the `compact` layout). The last three badges (CI state, stars and license)
are live: Plaque reads them from this repository instead of having them typed
in, and refreshes them at most every 10 minutes.

Plaque is a small stateless NestJS service. It is not a shields.io clone: the
point is the layout that changes with the screen width, which a plain `<img>`
cannot do on its own.

Live service: <https://plaque-ziwx.onrender.com> (Swagger UI at `/docs`). It
runs on a free Render instance that sleeps after 15 minutes without traffic,
so the first request after a quiet period can take up to a minute.

## How the adaptation works

An SVG inside `<img>` sees only its own width, not the screen's, and a small
badge in a README is never scaled down. So Plaque renders three separate SVGs
(`full`, `compact`, `vertical`) and the README picks one with
`<picture><source media>`. `GET /snippet` builds that HTML for you.

<!-- prettier-ignore -->
```html
<picture>
  <source media="(max-width: 600px)" srcset="https://YOUR-HOST/badge?label=build&amp;value=passing&amp;color=success&amp;icon=check-circle&amp;theme=auto&amp;layout=compact">
  <img src="https://YOUR-HOST/badge?label=build&amp;value=passing&amp;color=success&amp;icon=check-circle&amp;theme=auto&amp;layout=full" alt="build: passing">
</picture>
```

- On a narrow screen the label gives way to an icon.
- A status (`passing`, `failing`, `building`, ...) becomes a status icon in
  `compact`. Data (`12.4k`, `v2.1`) uses `vertical`: icon on top, value below.
  The service decides which one by an exact match against a list of status
  words, so a value like `stable` stays data.
- Browsers that ignore `<picture>` fall back to the `full` image.

## Quick start

With Docker:

```sh
docker build -t plaque .
docker run --rm -p 3000:3000 plaque
```

With Bun:

```sh
bun install
bun run start
```

Then open <http://localhost:3000/badge?label=build&value=passing&icon=check-circle>
or the Swagger UI at <http://localhost:3000/docs>. A live badge works the same
way: <http://localhost:3000/gh/oven-sh/bun/stars>.

## API

### `GET /badge`

Returns an SVG. `value` is required, everything else is optional.

| Param         | Meaning                                                 | Limits                           |
| ------------- | ------------------------------------------------------- | -------------------------------- |
| `label`       | Left text. Shown in `full` only.                        | up to 24 chars, may be empty     |
| `value`       | Right text: a status or data.                           | 1 to 24 chars, not blank         |
| `color`       | `success`, `warning`, `error`, `info`, `neutral` or hex | six hex digits **without** `#`   |
| `label-color` | Left (top) side: token or hex                           | default: theme surface           |
| `text-color`  | Text color, hex                                         | default: picked for contrast     |
| `icon-color`  | Icon color, hex                                         | default: the text color          |
| `icon`        | Icon name from the whitelist below                      | unknown name is a 400            |
| `icon-path`   | Your own icon: one SVG path, see below                  | up to 500 chars, not with `icon` |
| `icon-stroke` | Draw `icon-path` as an outline of this width            | 0.25 to 6, needs `icon-path`     |
| `theme`       | `auto` (follows the system theme), `light`, `dark`      | default `auto`                   |
| `layout`      | `full`, `compact`, `vertical`                           | default `full`                   |

Hex has no `#` because `#` starts a URL fragment.

Without `label-color` the left side follows the theme. With it and without
`color`, the right side becomes a darker shade of the left one; pass `color`
to choose both sides yourself.

Icons (38): `alert` `apple` `bitbucket` `bug` `bun` `check` `check-circle`
`clock` `code` `codeberg` `docker` `download` `eye` `git-branch`
`git-pull-request` `github` `gitlab` `heart` `info` `law` `linux` `nestjs`
`npm` `package` `repo` `rocket` `shield-check` `skip` `star` `stop` `swift`
`sync` `tag` `typescript` `workflow` `x` `x-circle`

Icon paths are copied into the repository and embedded in the SVG, so a badge
makes no external requests.

Your own icon: `icon-path` takes the `d` attribute of a single SVG `<path>`
drawn on a 24x24 grid, for example `M12 2L2 22h20z`. Only the commands
`M L H V C S Q T A Z` (either case) and numbers up to 100 are accepted, up to
500 characters. The color comes from the theme. Anything else is a 400, and a
whole SVG file is never accepted: a badge URL can be opened directly, so
markup in it would run on this origin.

Outline icons: add `icon-stroke` (a line width on the same grid, usually `2`)
and the path is drawn as a round line instead of being filled. Several shapes
can share one path as sub-paths (`M...z M...`), but one badge icon is either
filled or outlined, never both.

### `GET /snippet`

Takes the same params as `/badge` except `layout`, plus `breakpoint` (screen
width in px, 320 to 1200, default 600). Returns the `<picture>` HTML as
`text/plain`. The origin in the URLs comes from `PUBLIC_URL`, or from the
request host if it is not set.

### `GET /gh/:owner/:repo/:metric`

A badge whose value is read from GitHub. The label, color and icon are
defaults for the metric, and it takes the params of `/badge` except `value`;
anything you pass replaces a default, even an
