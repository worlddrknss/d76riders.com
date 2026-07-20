<div align="center">

# District 76

**All bikes, all riders, one community.**

A community-focused motorcycle platform for planning group rides, mapping scenic
roads, tracking builds, and keeping riders connected. Founded in Clarksville, TN
— open to riders wherever the road goes.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma_7-336791?logo=postgresql&logoColor=white)](https://www.prisma.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Security](#security)
- [License & Trademark](#license--trademark)

## Features

- **Rider profiles** — a shared identity with a journal, garage, events, and media, plus data-driven trust levels and badges.
- **Garage & builds** — track bikes, modifications, and service history with a build timeline and per-bike maintenance reminders.
- **Events** — organize group rides with RSVPs, check-ins, a route planner, turn-by-turn stops, and a live ride map that shares rider locations during the ride.
- **Roads & routes** — community-rated roads with blended Route Quality scores (scenery, pavement, twistiness), difficulty read from elevation, and rider-flagged hazards.
- **Social feed** — a chronological feed (Latest / Following) with a separate opt-in Momentum ranking, stories, and post interactions.
- **Messaging & notifications** — direct messages between mutually-following riders and web-push notifications (PWA).
- **Safety** — waiver acknowledgment, emergency contact vault, and hazard reporting.

## Tech Stack

| Layer            | Technology                                                      |
| ---------------- | --------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org/) (App Router, RSC, Server Actions) |
| Language         | [TypeScript](https://www.typescriptlang.org/) · [React 19](https://react.dev/) |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com/)                     |
| Database         | [PostgreSQL](https://www.postgresql.org/) via [Prisma 7](https://www.prisma.io/) (PrismaPg adapter) |
| Maps             | [MapLibre GL](https://maplibre.org/) · MapTiler · Mapbox routing |
| Storage          | S3-compatible object storage (AWS S3 / MinIO)                   |
| Email            | SMTP via [Nodemailer](https://nodemailer.com/)                  |
| Background jobs  | [Inngest](https://www.inngest.com/)                             |
| Notifications    | Web Push (VAPID)                                                |

## Getting Started

### Prerequisites

- **Node.js 22+** and npm
- **PostgreSQL 15+**
- (Optional) An S3-compatible bucket, SMTP credentials, and a MapTiler key for full functionality

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/worlddrknss/d76riders.com.git
cd d76riders.com

# 2. Install dependencies
npm install

# 3. Configure your environment
cp .env.example .env
# then fill in the values (see Configuration below)

# 4. Set up the database
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Start the dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Configuration

Copy `.env.example` to `.env` and set the following. Only `DATABASE_URL` is
required to boot; the rest unlock individual features and degrade gracefully
when unset (e.g. email logs a warning instead of sending).

### Required

| Variable       | Description                                     |
| -------------- | ----------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                    |

### Optional

| Variable                    | Description                                            |
| --------------------------- | ----------------------------------------------------- |
| `AUTH_SESSION_SECRET`       | Secret used to sign session cookies                   |
| `NEXT_PUBLIC_SITE_URL`      | Canonical site URL (used for absolute links & OG)     |
| `NEXT_PUBLIC_MAPTILER_KEY`  | MapTiler key for base map tiles                       |
| `MAPBOX_TOKEN`              | Mapbox token for route snapping                       |
| `S3_ENDPOINT` · `S3_PUBLIC_ENDPOINT` · `S3_REGION` · `S3_BUCKET` · `S3_ACCESS_KEY_ID` · `S3_SECRET_ACCESS_KEY` · `S3_FORCE_PATH_STYLE` | S3-compatible object storage for uploads |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` · `EMAIL_FROM` | Outbound email (verification, notifications) |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_SUBJECT` | Web-push notifications |
| `EMERGENCY_MASTER_KEY`      | Encryption key for the emergency-contact vault        |
| `MALWARE_SCAN_MODE`         | `off` (default) or `clamav` for upload scanning       |
| `CLAMAV_HOST` · `CLAMAV_PORT` | ClamAV service address when scanning is enabled     |

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server                 |
| `npm run build`         | Production build                             |
| `npm run start`         | Serve the production build                   |
| `npm run lint`          | Run ESLint                                    |
| `npm run db:generate`   | Generate the Prisma client                   |
| `npm run db:migrate`    | Apply database migrations (dev)              |
| `npm run db:seed`       | Seed baseline data                           |
| `npm run db:seed:catalog` | Seed the reference catalog                  |
| `npm run db:studio`     | Open Prisma Studio                           |

## Deployment

Build and run the container image:

```bash
docker build -t d76riders:local .

docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:5432/d76riders?schema=public" \
  -e NEXT_PUBLIC_MAPTILER_KEY="your-maptiler-key" \
  d76riders:local
```

The image runs `prisma migrate deploy` on startup. In production, District 76 is
deployed to Kubernetes via a GitOps pipeline (image built by CI, rolled out by
Flux CD). Any container platform that can provide the environment variables
above and reach a PostgreSQL instance will work.

## Project Structure

```text
src/
  app/            # Next.js App Router routes, layouts, and server actions
  components/     # UI components (layout shell, feed, garage, roads, events…)
  lib/            # Server/domain logic (reputation, elevation, mailer, auth…)
prisma/
  schema/         # Prisma schema (split by domain) and migrations
```

Framework note: this project tracks a current Next.js release — consult the
guides under `node_modules/next/dist/docs/` before relying on older App Router
patterns.

## Contributing

Contributions are welcome. Please read the [Contributing Guide](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.

- **Contributing guide:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Contributions log:** [CONTRIBUTIONS.md](CONTRIBUTIONS.md)
- **Code of conduct:** [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Security

Found a vulnerability? Please follow the process in our
[Security Policy](SECURITY.md) — do not open a public issue for security
reports.

## License & Trademark

- **Software** is licensed under the [GNU AGPL v3.0](LICENSE).
- **Brand** — the "District 76" name, logo, and artwork are trademarked and are
  **not** covered by the open-source license. See [TRADEMARKS.md](TRADEMARKS.md).

If you deploy a modified version of this software over a network, the AGPL
requires you to make your source available to its users.
