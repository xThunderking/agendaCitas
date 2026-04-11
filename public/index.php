<?php

declare(strict_types=1);

use App\Controllers\AdminController;
use App\Controllers\BookingController;
use App\Core\Router;
use App\Core\Session;

require dirname(__DIR__) . '/app/helpers.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';

    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (is_file($file)) {
        require $file;
    }
});

$config = require dirname(__DIR__) . '/config/config.php';
date_default_timezone_set($config['app']['timezone']);
Session::start();

$router = new Router();

$router->get('/', [BookingController::class, 'create']);
$router->get('/book', [BookingController::class, 'create']);
$router->post('/book', [BookingController::class, 'store']);

$router->get('/admin', [AdminController::class, 'index']);
$router->get('/admin/citas', [AdminController::class, 'dashboard']);
$router->get('/admin/editar', [AdminController::class, 'editForm']);
$router->post('/admin/actualizar', [AdminController::class, 'update']);
$router->post('/admin/cancelar', [AdminController::class, 'cancel']);

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
$cleanPath = $uriPath;

if ($scriptDir !== '' && $scriptDir !== '/' && str_starts_with($uriPath, $scriptDir)) {
    $cleanPath = substr($uriPath, strlen($scriptDir)) ?: '/';
}

$cleanPath = '/' . ltrim($cleanPath, '/');

$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $cleanPath, $config);
