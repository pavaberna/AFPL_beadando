<?php

declare(strict_types=1);

// GET    /admin/students.php?class_id=1 - az osztály diákjai
// POST   /admin/students.php  {"class_id": 1, "name": "..."}  (a súly automatikusan 10)
// PATCH  /admin/students.php  {"id": 5, "name"?, "weight"?, "class_id"?}  (legalább egy mező kötelező)
// DELETE /admin/students.php  {"id": 5}

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('GET', 'POST', 'PATCH', 'DELETE');
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDb();

if ($method === 'GET') {
    $classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);

    if ($classId === false) {
        jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
    }

    if (!classExists($db, $classId)) {
        jsonResponse(404, ['error' => 'A megadott osztály nem található']);
    }

    jsonResponse(200, ['students' => listStudents($db, $classId)]);
}

$body = jsonRequestBody();

if ($method === 'POST') {
    $name = cleanString($body['name'] ?? null);
    $classId = $body['class_id'] ?? null;

    if ($name === null || !is_int($classId)) {
        jsonResponse(400, ['error' => 'A diák nevének és az osztály azonosítójának megadása kötelező']);
    }

    if (!classExists($db, $classId)) {
        jsonResponse(404, ['error' => 'A megadott osztály nem található']);
    }

    jsonResponse(201, ['student' => createStudent($db, $classId, $name)]);
}

$id = $body['id'] ?? null;

if (!is_int($id)) {
    jsonResponse(400, ['error' => 'A diák azonosítója egész szám kell legyen']);
}

if ($method === 'DELETE') {
    if (!studentExists($db, $id)) {
        jsonResponse(404, ['error' => 'A megadott diák nem található']);
    }

    deleteStudent($db, $id);
    jsonResponse(200, ['ok' => true]);
}

// PATCH
$changes = [];

if (array_key_exists('name', $body)) {
    $changes['name'] = cleanString($body['name']);

    if ($changes['name'] === null) {
        jsonResponse(400, ['error' => 'A diák neve nem lehet üres']);
    }
}

if (array_key_exists('weight', $body)) {
    if (!is_int($body['weight']) || $body['weight'] < 1) {
        jsonResponse(400, ['error' => 'A súly legalább 1 egész szám kell legyen']);
    }

    $changes['weight'] = $body['weight'];
}

if (array_key_exists('class_id', $body)) {
    if (!is_int($body['class_id'])) {
        jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
    }

    $changes['class_id'] = $body['class_id'];
}

if ($changes === []) {
    jsonResponse(400, ['error' => 'Legalább egy módosítandó mező megadása kötelező']);
}

if (!studentExists($db, $id)) {
    jsonResponse(404, ['error' => 'A megadott diák nem található']);
}

if (isset($changes['class_id']) && !classExists($db, $changes['class_id'])) {
    jsonResponse(404, ['error' => 'A megadott osztály nem található']);
}

jsonResponse(200, ['student' => updateStudent($db, $id, $changes)]);
