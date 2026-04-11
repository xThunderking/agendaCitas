# Agenda de Citas MVC (PHP + MySQL)

Sistema de agenda web simple y profesional con dos accesos:

- Link publico para registrar citas.
- Link administrador para ver, editar y cancelar.

## Caracteristicas

- Arquitectura MVC ordenada.
- Responsive (web y celular, mobile-first).
- Prevencion de doble reserva para el mismo horario y fecha.
- Panel administrador de acceso libre (sin login).
- Filtro por fecha en panel.
- SQL completo para importar.

## Requisitos

- PHP 8.1+
- MySQL 5.7+ o MariaDB compatible
- Apache (XAMPP recomendado)

## Instalacion local (XAMPP)

1. Copia el proyecto en `c:\xampp\htdocs\agendaCitas`.
2. Importa `database/agenda_citas.sql` en phpMyAdmin.
3. Verifica credenciales DB en `config/config.php`.
4. Inicia Apache y MySQL.
5. Abre:
   - Publico: `http://localhost/agendaCitas/public/book`
   - Admin: `http://localhost/agendaCitas/public/admin`

## Estructura

- `app/Core`: clases base (Router, DB, View, Session, CSRF)
- `app/Controllers`: logica de peticiones
- `app/Models`: acceso a datos
- `app/Views`: interfaz
- `public`: punto de entrada y assets
- `database`: script SQL

## Nota de despliegue

Netlify no ejecuta PHP/MySQL de forma nativa. Opciones recomendadas:

1. Backend PHP + MySQL en hosting con PHP (Hostinger/cPanel/VPS/Render con Docker).
2. Frontend estatico en Netlify y backend/API en otro servidor.

Si quieres, en el siguiente paso te lo preparo tambien en version API + frontend separado para Netlify.
