<?php

declare(strict_types=1);

namespace App\Core;

final class Csrf
{
    public static function token(): string
    {
        Session::start();
        $token = Session::get('_csrf_token');

        if (!is_string($token) || $token === '') {
            $token = bin2hex(random_bytes(32));
            Session::set('_csrf_token', $token);
        }

        return $token;
    }

    public static function validate(?string $token): bool
    {
        Session::start();
        $current = Session::get('_csrf_token');

        return is_string($token)
            && is_string($current)
            && hash_equals($current, $token);
    }
}
