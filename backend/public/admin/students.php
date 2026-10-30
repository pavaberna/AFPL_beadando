<?php

declare(strict_types=1);

// POST /admin/students.php  {"class_id": 1, "name": "..."}  (a súly automatikusan 10)

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('POST');
requireAdmin();

$body = jsonRequestBody();
$name = cleanString($body['name'] ?? null);
$classId = $body['class_id'] ?? null;

if ($name === null || !is_int($classId)) {
    jsonResponse(400, ['error' => 'A diák nevének és az osztály azonosítójának megadása kötelező']);
}

$db = getDb();

if (!classExists($db, $classId)) {
    jsonResponse(404, ['error' => 'A megadott osztály nem található']);
}

jsonResponse(201, ['student' => createStudent($db, $classId, $name)]);
