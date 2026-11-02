<?php

declare(strict_types=1);

// POST /admin/students-import.php  (multipart/form-data: class_id, file)

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('POST');
requireAdmin();

$classId = filter_var($_POST['class_id'] ?? null, FILTER_VALIDATE_INT);

if ($classId === false) {
    jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
}

if (($_FILES['file']['error'] ?? null) !== UPLOAD_ERR_OK) {
    jsonResponse(400, ['error' => 'A CSV fájl feltöltése kötelező']);
}

$db = getDb();

if (!classExists($db, $classId)) {
    jsonResponse(404, ['error' => 'A megadott osztály nem található']);
}

try {
    $names = parseStudentCsv((string) file_get_contents($_FILES['file']['tmp_name']));
} catch (InvalidArgumentException $e) {
    jsonResponse(400, ['error' => $e->getMessage()]);
}

$result = importStudents($db, $classId, $names);

jsonResponse($result['imported'] === [] ? 200 : 201, $result);
