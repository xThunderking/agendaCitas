<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'Agenda de Citas',
        'base_url' => rtrim((string) (getenv('APP_URL') ?: '/agendaCitas/public'), '/'),
        'timezone' => 'America/Mexico_City',
    ],
    'db' => [
        'host' => (string) (getenv('DB_HOST') ?: '127.0.0.1'),
        'port' => (int) (getenv('DB_PORT') ?: 3306),
        'database' => (string) (getenv('DB_DATABASE') ?: 'agenda_citas'),
        'username' => (string) (getenv('DB_USERNAME') ?: 'root'),
        'password' => (string) (getenv('DB_PASSWORD') ?: ''),
        'charset' => 'utf8mb4',
    ],
];
