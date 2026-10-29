<?php

declare(strict_types=1);

// POST /admin/classes.php  {"name": "...", "teacher_id": 2}  (a teacher_id elhagyható vagy null)

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('POST');
requireAdmin();

$body = jsonRequestBody();
$name = cleanString($body['name'] ?? null);
$teacherId = $body['teacher_id'] ?? null;

if ($name === null) {
    jsonResponse(400, ['error' => 'Az osztály nevének megadása kötelező']);
}

if ($teacherId !== null && !is_int($teacherId)) {
    jsonResponse(400, ['error' => 'A tanár azonosítója egész szám kell legyen']);
}

$db = getDb();

if (classNameTaken($db, $name)) {
    jsonResponse(409, ['error' => 'Ilyen nevű osztály már létezik']);
}

if ($teacherId !== null && !teacherExists($db, $teacherId)) {
    jsonResponse(404, ['error' => 'A megadott tanár nem található']);
}

jsonResponse(201, ['class' => createClass($db, $name, $teacherId)]);
