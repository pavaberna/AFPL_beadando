<?php

declare(strict_types=1);

// POST /admin/teachers.php  {"username": "...", "password": "...", "display_name": "..."}

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('POST');
requireAdmin();

$body = jsonRequestBody();
$username = cleanString($body['username'] ?? null);
$displayName = cleanString($body['display_name'] ?? null);
$password = $body['password'] ?? null;

if ($username === null || $displayName === null || !is_string($password) || $password === '') {
    jsonResponse(400, ['error' => 'A felhasználónév, a jelszó és a megjelenített név megadása kötelező']);
}

$db = getDb();

if (usernameTaken($db, $username)) {
    jsonResponse(409, ['error' => 'Ez a felhasználónév már foglalt']);
}

jsonResponse(201, ['teacher' => createTeacher($db, $username, $password, $displayName)]);
