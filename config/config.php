<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'Agenda de Citas',
        'base_url' => rtrim((string) (getenv('APP_URL') ?: '/agendaCitas/public'), '/'),
        'timezone' => 'America/Mexico_City',
    ],
    'db' => [
        'host' => 'agenda-citas-db.ce52g4cuedb1.us-east-1.rds.amazonaws.com',
        'port' => 3306,
        'database' => 'agenda_citas',
        'username' => 'admin',
        'password' => 'Syscomhaq23*',
        'charset' => 'utf8mb4',
    ],

];
