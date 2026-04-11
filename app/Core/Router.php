<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    private array $routes = [];

    public function get(string $path, array $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, array $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    private function add(string $method, string $path, array $handler): void
    {
        $this->routes[$method][rtrim($path, '/') ?: '/'] = $handler;
    }

    public function dispatch(string $method, string $path, array $config): void
    {
        $method = strtoupper($method);
        $normalized = rtrim($path, '/') ?: '/';

        $handler = $this->routes[$method][$normalized] ?? null;
        if (!$handler) {
            http_response_code(404);
            echo 'Ruta no encontrada.';
            return;
        }

        [$controllerClass, $action] = $handler;
        $controller = new $controllerClass($config);
        $controller->{$action}();
    }
}
