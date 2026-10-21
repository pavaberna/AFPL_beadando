<?php

declare(strict_types=1);

// POST /login.php  {"username": "...", "password": "..."}

require_once __DIR__ . '/../src/bootstrap.php';

requireMethod('POST');

$body = jsonRequestBody();
$username = $body['username'] ?? null;
$password = $body['password'] ?? null;

if (!is_string($username) || !is_string($password) || $username === '' || $password === '') {
    jsonResponse(400, ['error' => 'A felhasználónév és a jelszó megadása kötelező']);
}

$user = login(getDb(), $username, $password);

if ($user === null) {
    jsonResponse(401, ['error' => 'Hibás felhasználónév vagy jelszó']);
}

jsonResponse(200, ['user' => $user]);
