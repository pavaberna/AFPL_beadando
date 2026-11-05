<?php

declare(strict_types=1);

// GET    /admin/classes.php - az összes osztály listája a hozzárendelt tanárokkal (teachers)
// POST   /admin/classes.php  {"name": "...", "teacher_id": 2}  (a teacher_id elhagyható vagy null)
// PATCH  /admin/classes.php  {"id": 1, "name": "..."}
// DELETE /admin/classes.php  {"id": 1}  (az osztály diákjai is törlődnek)

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('GET', 'POST', 'PATCH', 'DELETE');
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$db = getDb();

if ($method === 'GET') {
    jsonResponse(200, ['classes' => listClasses($db)]);
}

$body = jsonRequestBody();

if ($method === 'POST') {
    $name = cleanString($body['name'] ?? null);
    $teacherId = $body['teacher_id'] ?? null;

    if ($name === null) {
        jsonResponse(400, ['error' => 'Az osztály nevének megadása kötelező']);
    }

    if ($teacherId !== null && !is_int($teacherId)) {
        jsonResponse(400, ['error' => 'A tanár azonosítója egész szám kell legyen']);
    }

    if (classNameTaken($db, $name)) {
        jsonResponse(409, ['error' => 'Ilyen nevű osztály már létezik']);
    }

    if ($teacherId !== null && !teacherExists($db, $teacherId)) {
        jsonResponse(404, ['error' => 'A megadott tanár nem található']);
    }

    jsonResponse(201, ['class' => createClass($db, $name, $teacherId)]);
}

$id = $body['id'] ?? null;

if (!is_int($id)) {
    jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
}

if ($method === 'DELETE') {
    if (!classExists($db, $id)) {
        jsonResponse(404, ['error' => 'A megadott osztály nem található']);
    }

    deleteClass($db, $id);
    jsonResponse(200, ['ok' => true]);
}

// PATCH
$name = cleanString($body['name'] ?? null);

if ($name === null) {
    jsonResponse(400, ['error' => 'Az osztály nevének megadása kötelező']);
}

if (!classExists($db, $id)) {
    jsonResponse(404, ['error' => 'A megadott osztály nem található']);
}

if (classNameTaken($db, $name, $id)) {
    jsonResponse(409, ['error' => 'Ilyen nevű osztály már létezik']);
}

renameClass($db, $id, $name);

jsonResponse(200, ['class' => listClasses($db, $id)[0]]);
