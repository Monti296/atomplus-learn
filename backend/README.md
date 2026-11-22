# Backend

NestJS API for AtomPlus Learn. Built in phase 1 onward.

Run these commands from this folder:

```powershell
Copy-Item ..\.env.example ..\.env
npm run dev
```

`npm run dev` compiles the backend and starts it. `npm start` runs an existing compiled backend:

```powershell
npm run build
npm start
```

For local database work, start the throwaway PostgreSQL container from the
repository root:

```powershell
docker compose up -d db
```

The API validates `NODE_ENV`, `PORT`, `FRONTEND_ORIGIN` and `DATABASE_URL` at
startup. Apply migrations with `npm run db:migrate:deploy`. The database
integration test resets the configured test database, applies all migrations
to an empty database, and then tests creating and reading a user:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomplus_learn"
npm run test:database
```
