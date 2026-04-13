# Agenda de Citas en Netlify + AWS RDS

Este proyecto ya quedo adaptado para desplegar en Netlify con:

- Frontend estatico en `web/`
- API en Netlify Functions (`netlify/functions/api.js`)
- Base de datos MySQL en AWS RDS

S3 se usa solo para respaldos, no como base de datos activa.

## Caracteristicas

- Vista publica para registrar cita: `/`
- Panel administrador libre: `/admin.html`
- Edicion de cita: `/admin-edit.html?id=ID`
- Diseno responsive y agenda enfocada en celular
- Bloqueo de citas duplicadas por fecha/hora

## Requisitos

- Node.js 20+ (recomendado)
- AWS RDS MySQL
- Netlify (sitio conectado al repositorio)

## Variables de entorno en Netlify

Configuralas en `Site settings > Environment variables`:

- `DB_HOST` = endpoint de RDS
- `DB_PORT` = `3306`
- `DB_NAME` = `agenda_citas`
- `DB_USER` = usuario de RDS
- `DB_PASSWORD` = password de RDS
- `DB_SSL` = `false` (o `true` si tu instancia exige SSL)

Tambien tienes una plantilla lista:

- `.env.example`

## SQL inicial

Importa este archivo en tu RDS:

- `database/agenda_citas.sql`

## Ejecutar local en modo Netlify

1. Instala dependencias:
   - `npm install`
2. Crea `.env` local con las variables DB:
   - `DB_HOST=...`
   - `DB_PORT=3306`
   - `DB_NAME=agenda_citas`
   - `DB_USER=...`
   - `DB_PASSWORD=...`
3. Levanta entorno local:
   - `npx netlify dev`
4. Abre:
   - `http://localhost:8888/`

## Despliegue en Netlify

1. Conecta el repo en Netlify.
2. Build command: vacio (o `npm run build`).
3. Publish directory: `web`
4. Functions directory: `netlify/functions` (ya esta en `netlify.toml`).
5. Configura variables de entorno y despliega.

## Rutas API disponibles

- `GET /api/appointments?date=YYYY-MM-DD`
- `GET /api/appointments/:id`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `POST /api/appointments/:id/cancel`

## Respaldo en S3 (opcional)

Ejemplo de dump y subida:

1. `mysqldump -h TU_RDS -P 3306 -u TU_USER -p agenda_citas > backup.sql`
2. `aws s3 cp backup.sql s3://TU_BUCKET/backups/backup_YYYY-MM-DD.sql`
