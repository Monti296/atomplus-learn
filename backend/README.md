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

The API validates `NODE_ENV`, `PORT` and `FRONTEND_ORIGIN` at startup and stops if the frontend origin is missing or invalid.
