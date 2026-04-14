# Registro de Clases en Netlify + AWS RDS

Este proyecto ya quedo adaptado para desplegar en Netlify con:

- Frontend estatico en `web/`
- API en Netlify Functions (`netlify/functions/api.js`)
- Base de datos MySQL en AWS RDS

S3 se usa solo para respaldos, no como base de datos activa.

## Caracteristicas

- Link 1 (formulario): `/`
- Link 2 (registros): `/admin.html`
- Horarios fijos: `07:00-08:00` y `09:00-10:00`
- Solo clases de lunes a viernes
- Capacidad maxima de 30 participantes por clase (fecha + horario)
- No se permiten nombres completos repetidos en todo el sistema
- Diseno responsive enfocado en celular

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

- `GET /api/registrations?date=YYYY-MM-DD`
- `POST /api/registrations`

## Respaldo en S3 (opcional)

Ejemplo de dump y subida:

1. `mysqldump -h TU_RDS -P 3306 -u TU_USER -p agenda_citas > backup.sql`
2. `aws s3 cp backup.sql s3://TU_BUCKET/backups/backup_YYYY-MM-DD.sql`
