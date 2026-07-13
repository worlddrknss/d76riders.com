# District 76

District 76 is a community-focused motorcycle platform built with Next.js.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run lint checks:

```bash
npm run lint
```

## Database Tasks

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Malware Scan Environment

Set these environment variables when running with upload malware scanning enabled:

```bash
MALWARE_SCAN_MODE=off
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
```

- Use `MALWARE_SCAN_MODE=clamav` in environments where ClamAV is reachable.
- Keep `MALWARE_SCAN_MODE=off` for local dev unless you are running a ClamAV service.

## Docker

Build the app image:

```bash
docker build -t d76riders:local .
```

Run with external Postgres and Minio already running in Orbstack:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:5432/d76riders?schema=public" \
  -e NEXT_PUBLIC_MAPTILER_KEY="your-maptiler-key" \
  d76riders:local
```

If your app later adds object storage integration, point it at your Orbstack Minio endpoint from environment variables.

## Open Source and Brand

- Software: Open source under AGPLv3.
- Brand: "District 76" name, logo, and artwork are trademarked and not included under the open-source license.

See LICENSE and TRADEMARKS.md for details.

## Community Files

- Contributing guide: CONTRIBUTING.md
- Contributions log: CONTRIBUTIONS.md
- Code of conduct: CODE_OF_CONDUCT.md
- Security policy: SECURITY.md
