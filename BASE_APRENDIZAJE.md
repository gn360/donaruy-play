# Base de Aprendizaje - Entretenimiento (donaruy-play)

- **Puerto Expuesto**: `8031`
- **Dominio Futuro**: `play.donafacil.uy`
- **Tecnologías**: React, Tailwind CSS, Vite
- **Estructura**: Juegos independientes en la carpeta `/src/games`.

## Pasos para ejecutar con Docker

```bash
docker compose up -d
```

## Connexión con Backend
- **Repositorio Backend**: `/home/desarrollo/Desarrollo/donaruyb`
- **Rutas API**: El backend expone la versión `play` (`/api/play`) de forma exclusiva para este proyecto, estructurado en `routes/api/play/api.php`, con soporte de Rate Limiter propio en `Kernel.php` base.
- **Cliente API Frontend**: Se implementó una instancia de Axios en `/frontend/src/api/apiClient.ts` que inyecta automáticamente el token de auth (`Bearer`) desde el `localStorage` y redirige a `/login` si detecta error `401`. Configurarlo usando `VITE_API_BASE_URL` en el archivo `.env`.

## CI/CD Setup (GitHub Actions)

**Archivos creados:**
- `.github/workflows/ci.yml` — Valida build en cada push/PR a main
- `.github/workflows/deploy.yml` — Deploy automático al hacer push a main

**Flujo:**
1. **CI (ci.yml)**: Instala deps, valida build, y hace smoke test del Docker image
2. **Deploy (deploy.yml)**: 
   - Build y publica imagen a GHCR (GitHub Container Registry)
   - SSH al servidor de producción
   - Ejecuta `docker compose pull` e `IMAGE_TAG=main docker compose up -d`

**Secretos de GitHub requeridos:**
- `DEPLOY_PATH` — Ruta del proyecto en el servidor
- `GHCR_TOKEN` — Token de acceso al registro
- `GHCR_USER` — Usuario del registro
- `SSH_HOST` — IP/dominio del servidor
- `SSH_PORT` — Puerto SSH
- `SSH_PHRASE` — Passphrase de la llave SSH
- `SSH_PRIVATE_KEY` — Llave privada SSH (Ed25519)
- `SSH_USER` — Usuario SSH del servidor

**Docker Compose actualizado:**
- Ahora descarga imagen desde GHCR: `ghcr.io/<repo>:${IMAGE_TAG:-main}`
- Usa variable `IMAGE_TAG` que se define en el workflow de deploy

## Estado del repo (2026-10-05)

- **Solo frontend**: el árbol contiene `frontend/` (React + Vite) y `docker-compose.yml`; no hay backend en este repo (el backend vive en `donaruyb`, rutas `/api/play`).
- El último commit es del **2026-06-02** ("auto deploy"). Hay trabajo **local sin commitear** en juegos: `frontend/src/api/apiClient.ts`, `frontend/src/games/RouletteGame.tsx` y `frontend/src/index.css` (modificados), más `frontend/src/api/playApi.ts`, `frontend/src/games/ClaimModal.tsx` y `frontend/src/games/DonationForm.tsx` (nuevos, sin trackear).
- La rama `main` local está divergente de `origin/main`.

