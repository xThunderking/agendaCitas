<?php

declare(strict_types=1);

namespace App\Core;

abstract class Controller
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    protected function view(string $template, array $data = []): void
    {
        View::render($template, $data, $this->config);
    }

    protected function redirect(string $path): void
    {
        $baseUrl = $this->config['app']['base_url'];
        header('Location: ' . $baseUrl . '/' . ltrim($path, '/'));
        exit;
    }
}
