<?php

declare(strict_types=1);

namespace App\Core;

final class View
{
    public static function render(string $template, array $data, array $config): void
    {
        $viewPath = dirname(__DIR__) . '/Views/' . $template . '.php';
        if (!is_file($viewPath)) {
            http_response_code(404);
            echo 'Vista no encontrada.';
            return;
        }

        extract($data, EXTR_SKIP);
        $appConfig = $config['app'];

        require dirname(__DIR__) . '/Views/layouts/header.php';
        require $viewPath;
        require dirname(__DIR__) . '/Views/layouts/footer.php';
    }
}
