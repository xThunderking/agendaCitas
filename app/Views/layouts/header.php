<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(($title ?? 'Agenda') . ' | ' . $appConfig['name']); ?></title>
    <link rel="stylesheet" href="<?= e($appConfig['base_url']); ?>/assets/css/app.css">
</head>
<body>
<header class="topbar">
    <div class="topbar__inner">
        <a class="brand" href="<?= e($appConfig['base_url']); ?>/book">Agenda Pro</a>
        <nav class="nav">
            <a href="<?= e($appConfig['base_url']); ?>/book">Agendar</a>
            <a href="<?= e($appConfig['base_url']); ?>/admin">Administrador</a>
        </nav>
    </div>
</header>
<main class="page">
