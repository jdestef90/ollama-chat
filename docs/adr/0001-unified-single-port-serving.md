# Unified Single-Port Serving via Express Static Mount

OTC consists of a React frontend and an Express proxy backend. To fulfill the single-service deployment requirement on `localhost:3000` with `docker-compose up -d`, we compile the React frontend into static production assets served directly by Express at `/`, alongside the `/api/*` endpoints. In local frontend development, Vite runs with an API proxy to Express.
