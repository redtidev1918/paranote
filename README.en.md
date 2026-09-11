# ParaNote

**Language / 语言:** [中文](README.md) · English

A lightweight paragraph-comment service plus a general-purpose web reader. It gives any web
page an immersive reading experience with paragraph-level comment interaction.

[![npm version](https://img.shields.io/npm/v/paranote.svg)](https://www.npmjs.com/package/paranote)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/redtidev1918/paranote?style=social)](https://github.com/redtidev1918/paranote)

**[npm](https://www.npmjs.com/package/paranote)** | **[GitHub](https://github.com/redtidev1918/paranote)** | **[Docs](https://redtidev1918.github.io/paranote/)**

## Contents

- [Core features](#core-features)
- [Quick start](#quick-start)
- [CLI](#cli)
- [Usage modes](#usage-modes)
- [Integration guide](#integration-guide)
- [Deployment](#deployment)
- [API reference](#api-reference)
- [Development](#development)

---

## Core features

- **Dual mode** — both a standalone reader and an embeddable comment plugin
- **Paragraph-level comments** — interaction precise to the paragraph, with replies, likes and deletion
- **Universal reader mode** — enter any URL, the article body is extracted automatically into a clean reading page
- **Strong anti-bot handling** — built-in Puppeteer + Stealth + BrowserForge, handling Cloudflare challenges automatically
- **Fuzzy anchoring** — comments are anchored by a content fingerprint, so they relocate automatically even when paragraphs are added or removed
- **Modern UI** — a Hypothesis-style card sidebar with colourful avatars and smooth animation
- **Mobile-friendly** — a bottom drawer interaction designed for phones
- **Anonymous support** — visitor identities are generated automatically, with per-IP like de-duplication
- **User blocking** — administrators can block abusive users
- **CLI management** — a complete command-line tool, so administration needs no web UI

---

## Quick start

### Option 1: global npm install (recommended)

```bash
npm install -g paranote

# initialise configuration
paranote init

# start the service
paranote start

# show help
paranote help
```

### Option 2: run directly with npx

```bash
npx paranote start --port 4000
```

### Option 3: Docker

```bash
docker run -d -p 4000:4000 -v $(pwd)/data:/app/data paranote
```

### Option 4: as a project dependency

```bash
npm install paranote
```

```javascript
import { startServer } from 'paranote';

// start the server
await startServer({ port: 4000 });

// or with finer-grained control
import { initStorage, server, config } from 'paranote';

await initStorage();
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

---

## CLI

ParaNote ships a complete CLI so comments and users can be managed without the web admin UI.

### Server commands

```bash
paranote start [options]
  --port, -p    port (default: 4000)
  --host        host (default: 0.0.0.0)
  --mode, -m    deployment mode: full | api | reader

paranote init     # create the configuration file
paranote build    # build the embed script
paranote version  # print the version
```

### Data management

```bash
paranote stats                 # statistics
paranote list                  # list comments
paranote search "<keyword>"    # search comments
paranote delete <id>           # delete a comment (shows details and asks for confirmation)
paranote export -o backup.json # export data
paranote import backup.json    # import data
paranote ban <user>            # block a user
paranote unban <user>          # unblock a user
paranote banlist               # show the block list
```

---

## Usage modes

### Mode 1: ParaNote Reader (standalone)

Runs as a standalone web service providing a clean reading experience with comments.

| Feature | URL | Notes |
|------|-----|------|
| Clean reading | `/read?url=<URL>` | Extracts the body, removes ads and sidebars |
| Verbatim import | `/import?url=<URL>` | Keeps the original styling |
| Telegra.ph | `/p/<slug>` | Optimised for Telegra.ph |
| Admin UI | `/admin.html` | Comment management, block list, data import/export |

**Userscript**: visit `http://localhost:4000/paranote.user.js` to install it, then press
`Alt+P` on any page to enable comments.

### Mode 2: ParaNote plugin (embedded)

Adds paragraph comments to a blog or novel site.

**1. Mark the article body**

```html
<article data-na-root data-work-id="novel_001" data-chapter-id="chapter_001">
  <p>First paragraph…</p>
  <p>Second paragraph…</p>
</article>
```

**2. Include the script**

```html
<script async src="https://your-server/embed.js"
        data-site-id="my-site"
        data-api-base="https://your-server"></script>
```

---

## Integration guide

### Script attributes

| Attribute | Required | Default | Notes |
|--------|------|--------|------|
| `src` | yes | - | URL of `embed.js` |
| `data-site-id` | yes | `default-site` | Unique site identifier |
| `data-api-base` | no | inferred | Backend API base URL |

### JWT user authentication

The token is a standard HS256 JWT whose payload must contain `siteId` and `sub`.

**Node.js**
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  siteId: 'my-site',
  sub: user.id,
  name: user.username,
  avatar: user.avatarUrl,
  role: 'admin'  // optional; admins may delete any comment
}, process.env.PARANOTE_SECRET);
```

**Python**
```python
import jwt, time
token = jwt.encode({
    "siteId": "my-site",
    "sub": str(user.id),
    "name": user.username,
    "exp": int(time.time()) + 3600
}, "YOUR_SECRET", algorithm="HS256")
```

**Front-end injection**
```html
<script>window.PARANOTE_TOKEN = "eyJhbGciOiJIUzI1Ni...";</script>
```

**Server configuration**
```bash
SITE_SECRETS='{"my-site":"YOUR_SECRET"}'
```

### Anonymous users

Without a user system, ParaNote derives a unique visitor identity from the IP address:

- **Stable identity**: `访客-a1b2c3` (based on an IP hash)
- **Stable avatar**: the same IP keeps a fixed avatar colour
- **Likes supported**: anonymous users can like (de-duplicated per IP)

### Style customisation

```css
:root {
  --na-bg: #f7f7f7;          /* background */
  --na-card-bg: #ffffff;     /* card background */
  --na-primary: #bd1c2b;     /* accent colour */
  --na-text: #333333;        /* text colour */
  --na-sidebar-width: 380px; /* sidebar width */
}
```

---

## Deployment

### Environment variables

```bash
paranote init          # initialise configuration
# or manually:
cp .env.example .env
nano .env
```

| Variable | Default | Notes |
|------|--------|------|
| `PORT` | 4000 | Service port |
| `HOST` | 0.0.0.0 | Listen address |
| `DEPLOY_MODE` | full | `full` / `api` / `reader` |
| `STORAGE_TYPE` | file | `file` / `mongo` |
| `MONGO_URI` | - | MongoDB connection string |
| `ADMIN_SECRET` | - | Admin secret |
| `SITE_SECRETS` | {} | JWT secrets (JSON) |
| `ENABLE_PUPPETEER` | true | Enable Puppeteer fetching |
| `PUPPETEER_HEADLESS` | true | Headless mode |
| `RATE_LIMIT` | true | Enable rate limiting |
| `RATE_LIMIT_MAX` | 100 | Max requests per minute |

### Deployment modes

| Mode | Notes | Memory |
|------|----------|----------|
| `full` | Home page + reader + all APIs | ~500MB |
| `api` | Core APIs only, no fetching | <100MB |
| `reader` | APIs + reader, no home page | ~500MB |

### Vercel deployment (serverless)

ParaNote can be deployed to Vercel Serverless Functions (API mode only).

1. Fork this project on GitHub
2. Import the project in Vercel
3. Configure the environment variables:
   - `STORAGE_TYPE`: `mongo`
   - `MONGO_URI`: `mongodb+srv://…` (your MongoDB Atlas connection string)
   - `ADMIN_SECRET`: (a generated random secret)
   - `SITE_SECRETS`: (your JWT secrets JSON)
4. Deploy

> Note: serverless mode does not support Puppeteer fetching (`/api/v1/fetch`); only the comment service APIs are available.

### Cloudflare Workers deployment (V8 edge)

ParaNote provides a fully edge-compatible rewrite that uses the MongoDB Atlas Data API.

> ⚠️ **Note**: the MongoDB Atlas Data API has been [deprecated](https://www.mongodb.com/docs/atlas/app-services/data-api/) and is being retired.
> New projects should prefer Vercel + `MONGO_URI`, or Atlas Functions / the official driver.
> If you still need the Workers version, assess the Data API's availability in your account first.

1. **Prepare**: enable the [Data API](https://www.mongodb.com/docs/atlas/app-services/data-api/) in MongoDB Atlas and obtain the URL and API key.
2. **Install**: `npm install -g wrangler`
3. **Configure**: set `ATLAS_API_URL` and friends in `wrangler.toml`.
4. **Secrets**:
   ```bash
   wrangler secret put ATLAS_API_KEY
   wrangler secret put SITE_SECRETS  # e.g. {"my-site":"secret"}
   wrangler secret put ADMIN_SECRET
   ```
5. **Deploy**: `wrangler deploy`

### Docker Compose (recommended)

```yaml
version: '3.8'
services:
  paranote:
    build: .
    ports:
      - "4000:4000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - ADMIN_SECRET=${ADMIN_SECRET}
    restart: always
```

```bash
docker-compose up -d
```

### Docker command line

```bash
# full deployment
docker run -d -p 4000:4000 -v $(pwd)/data:/app/data paranote

# low-memory mode
docker run -d -p 4000:4000 -e DEPLOY_MODE=api -e ENABLE_PUPPETEER=false paranote
```

### Updating a deployment

```bash
git pull
docker-compose up -d --build
```

> Data lives in the `/app/data` volume, so rebuilding the container does not lose comments.

---

## API reference

### Comment API

| Method | Endpoint | Notes |
|------|------|------|
| GET | `/api/v1/comments` | Fetch comments |
| POST | `/api/v1/comments` | Post a comment |
| POST | `/api/v1/comments/like` | Like |
| DELETE | `/api/v1/comments` | Delete a comment |

### User management API

| Method | Endpoint | Notes |
|------|------|------|
| GET | `/api/v1/ban` | Get the block list |
| POST | `/api/v1/ban` | Block a user |
| DELETE | `/api/v1/ban` | Unblock a user |

### Data management API

| Method | Endpoint | Notes |
|------|------|------|
| GET | `/api/v1/export` | Export data (requires `x-admin-secret`) |
| POST | `/api/v1/import` | Import data (requires `x-admin-secret`) |
| GET | `/api/v1/fetch` | Fetch a web page |

### Data migration example

```bash
# via the CLI (recommended)
paranote export -o backup.json
paranote import backup.json

# via the API
curl -H "x-admin-secret: $ADMIN_SECRET" http://localhost:4000/api/v1/export -o backup.json
curl -X POST -H "x-admin-secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
     -d @backup.json http://localhost:4000/api/v1/import
```

---

## Development

```bash
npm install           # install dependencies
npm start             # start the dev server
npm test              # run tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run lint          # lint
npm run build:embed   # build the minified embed.js
```

### Automated releases

The project releases through GitHub Actions: pushes to `main` and pull requests run lint +
tests (CI). To publish a new version:

```bash
# 1. bump the version (updates package.json, creates the tag and pushes)
npm version patch   # or minor / major
# the postversion script already runs git push && git push --tags
```

Pushing a `v*` tag makes the release pipeline run the full test suite, build
`dist/paranote.min.js`, publish to npm through
[npm Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers), and create a
GitHub Release with generated notes.

#### One-time setup: npm Trusted Publisher

Credentials are issued on the fly via OIDC and are short-lived, so **no `NPM_TOKEN` secret is
needed**. Bind it once on npmjs.com:

1. Open the npm package page → **Settings → Trusted Publisher**
2. Fill in:
   - **Repository**: `redtidev1918/paranote`
   - **Workflow filename**: `release.yml` (must match `.github/workflows/release.yml`)
   - **Environment**: leave empty
3. Save; pushing a `v*` tag then releases automatically.

Requirements: the workflow runs on GitHub-hosted runners and npm CLI ≥ 11.5.1 (the release job
pins Node 24, which bundles npm 11.x).

> The npm package owners are `zoidberg-xgd` and `redtidev1918`; either can configure the
> Trusted Publisher and publish without renaming the package. Publishing from a new fork or
> account requires the package owner to bind it, or renaming to a scoped package such as
> `@yourname/paranote`. Without OIDC you can fall back to a repository `NPM_TOKEN` secret plus
> `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the publish step.

Version history: [CHANGELOG.md](CHANGELOG.md).

### Project layout

```text
├── index.js           # npm package entry
├── server.js          # main server entry
├── config.js          # configuration
├── storage.js         # storage abstraction
├── storage-file.js    # file storage
├── storage-mongo.js   # MongoDB storage
├── fetcher.js         # web fetching
├── browser-forge.js   # browser fingerprint generation
├── utils.js           # utilities
├── bin/paranote.js    # CLI entry
├── routes/api.js      # API routes
├── routes/static.js   # static file routes
├── public/            # embed.js, loader.js, userscript, pages, admin UI
└── tests/             # 240+ test cases
```

### Technical details

**Fuzzy anchoring**: saving a comment records a paragraph "fingerprint" (the first 32
characters). On load, if the paragraph index does not match, the front end searches the whole
page for that fingerprint and corrects the comment's position.

**Low-memory mode**: `ENABLE_PUPPETEER=false` disables Chrome, bringing memory below 100MB at
the cost of not being able to fetch Cloudflare-protected sites.

---

## Acknowledgements

- **[Hypothesis](https://github.com/hypothesis/h)** — open-source web annotation system; inspiration for the UI
- **[BrowserForge](https://github.com/daijro/browserforge)** — intelligent browser fingerprint generation

## License

MIT
