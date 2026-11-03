<?php

declare(strict_types=1);

// GET    /admin/teachers.php - az összes tanár listája a hozzájuk rendelt osztályok azonosítóival (class_ids)
// POST   /admin/teachers.php  {"username": "...", "password": "...", "display_name": "..."}
// PATCH  /admin/teachers.php  {"id": 2, "display_name"?, "username"?, "password"?, "class_ids"?: [1, 3]}
//        (legalább egy mező kötelező; a class_ids a tanár osztályainak teljes új listája, az üres lista mindet leveszi)
// DELETE /admin/teachers.php  {"id": 2}

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('GET', 'POST', 'PATCH', 'DELETE');
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDb();

if ($method === 'GET') {
    jsonResponse(200, ['teachers' => listTeachers($db)]);
}

$body = jsonRequestBody();

if ($method === 'POST') {
    $username = cleanString($body['username'] ?? null);
    $displayName = cleanString($body['display_name'] ?? null);
    $password = $body['password'] ?? null;

    if ($username === null || $displayName === null || !is_string($password) || $password === '') {
        jsonResponse(400, ['error' => 'A felhasználónév, a jelszó és a megjelenített név megadása kötelező']);
    }

    if (usernameTaken($db, $username)) {
        jsonResponse(409, ['error' => 'Ez a felhasználónév már foglalt']);
    }

    jsonResponse(201, ['teacher' => createTeacher($db, $username, $password, $displayName)]);
}

$id = $body['id'] ?? null;

if (!is_int($id)) {
    jsonResponse(400, ['error' => 'A tanár azonosítója egész szám kell legyen']);
}

if ($method === 'DELETE') {
    if (!teacherExists($db, $id)) {
        jsonResponse(404, ['error' => 'A megadott tanár nem található']);
    }

    deleteTeacher($db, $id);
    jsonResponse(200, ['ok' => true]);
}

// PATCH
$changes = [];

foreach (['username', 'display_name'] as $field) {
    if (array_key_exists($field, $body)) {
        $changes[$field] = cleanString($body[$field]);

        if ($changes[$field] === null) {
            jsonResponse(400, ['error' => 'A felhasználónév és a megjelenített név nem lehet üres']);
        }
    }
}

if (array_key_exists('password', $body)) {
    if (!is_string($body['password']) || $body['password'] === '') {
        jsonResponse(400, ['error' => 'A jelszó nem lehet üres']);
    }

    $changes['password'] = $body['password'];
}

$classIds = null;

if (array_key_exists('class_ids', $body)) {
    if (!isIntList($body['class_ids'])) {
        jsonResponse(400, ['error' => 'A class_ids egész számokból álló lista kell legyen']);
    }

    $classIds = $body['class_ids'];
}

if ($changes === [] && $classIds === null) {
    jsonResponse(400, ['error' => 'Legalább egy módosítandó mező megadása kötelező']);
}

if (!teacherExists($db, $id)) {
    jsonResponse(404, ['error' => 'A megadott tanár nem található']);
}

if (isset($changes['username']) && usernameTaken($db, $changes['username'], $id)) {
    jsonResponse(409, ['error' => 'Ez a felhasználónév már foglalt']);
}

foreach ($classIds ?? [] as $classId) {
    if (!classExists($db, $classId)) {
        jsonResponse(404, ['error' => 'A megadott osztály nem található']);
    }
}

updateTeacher($db, $id, $changes, $classIds);

jsonResponse(200, ['teacher' => listTeachers($db, $id)[0]]);
