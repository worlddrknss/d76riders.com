# Contributing

Thanks for your interest in contributing to District 76.

## Ground Rules

- Be respectful and constructive in discussions.
- Keep pull requests focused and small when possible.
- Document behavior changes in PR descriptions.
- Add or update tests when you change logic.
- Follow the code style and lint rules used by the repository.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Run lint checks before opening a pull request:

   ```bash
   npm run lint
   ```

4. If your change touches Prisma schema or data flows, run relevant DB commands:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

## Pull Request Checklist

- [ ] Code builds and runs locally.
- [ ] Linting passes.
- [ ] New behavior is tested or manually verified.
- [ ] Docs are updated if needed.
- [ ] The PR description explains what changed and why.

## License

By submitting contributions, you agree that your contributions are licensed
under the same license as this project (AGPLv3 or later).

## Trademark Notice

Contributing code does not grant rights to use District 76 trademarks.
See TRADEMARKS.md for details.
