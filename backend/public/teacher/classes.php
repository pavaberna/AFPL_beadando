<?php

declare(strict_types=1);

// GET /teacher/classes.php - a bejelentkezett tanár osztályai
// GET /teacher/classes.php?class_id=1 - ugyanez, kiegészítve az osztály diákjaival

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/teacher.php';

requireMethod('GET');
requireTeacher();

$teacherId = (int) currentUser()['id'];
$db = getDb();

$response = ['classes' => listTeacherClasses($db, $teacherId)];

if (isset($_GET['class_id'])) {
    $classId = filter_var($_GET['class_id'], FILTER_VALIDATE_INT);

    if ($classId === false) {
        jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
    }

    $owner = findClassOwner($db, $classId);

    if ($owner === null) {
        jsonResponse(404, ['error' => 'A megadott osztály nem található']);
    }

    if ($owner['teacher_id'] !== $teacherId) {
        jsonResponse(403, ['error' => 'Ez az osztály nem hozzád tartozik']);
    }

    $response['students'] = listClassStudents($db, $classId);
}

jsonResponse(200, $response);
