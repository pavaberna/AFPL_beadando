<?php

declare(strict_types=1);

// POST /teacher/draw.php  {"class_id": 1, "count": 3, "absent_ids": [4, 7]}  (az absent_ids elhagyható)
// A bejelentkezett tanár a saját osztályából kisorsol legfeljebb count darab diákot, a hiányzók és a
// ma már kihúzottak nélkül. Ha kevesebben sorsolhatók, annyit ad vissza, ahányan vannak (akár egyet sem).

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/teacher.php';
require_once __DIR__ . '/../../src/draw.php';

requireMethod('POST');
requireTeacher();

$body = jsonRequestBody();
$classId = $body['class_id'] ?? null;
$count = $body['count'] ?? null;
$absentIds = $body['absent_ids'] ?? [];

if (!is_int($classId)) {
    jsonResponse(400, ['error' => 'Az osztály azonosítója egész szám kell legyen']);
}

if (!is_int($count) || $count < 1) {
    jsonResponse(400, ['error' => 'A sorsolandó diákok száma legalább 1 egész szám kell legyen']);
}

$absentIdsAreInts = is_array($absentIds)
    && array_is_list($absentIds)
    && array_filter($absentIds, 'is_int') === $absentIds;

if (!$absentIdsAreInts) {
    jsonResponse(400, ['error' => 'Az absent_ids egész számokból álló lista kell legyen']);
}

$teacherId = (int) currentUser()['id'];
$db = getDb();
$assigned = teacherHasClass($db, $teacherId, $classId);

if ($assigned === null) {
    jsonResponse(404, ['error' => 'A megadott osztály nem található']);
}

if (!$assigned) {
    jsonResponse(403, ['error' => 'Ez az osztály nem hozzád tartozik']);
}

$today = today();

try {
    $students = drawStudents($db, $classId, $count, $absentIds, $today);
} catch (PDOException $e) {
    // A draw_history (student_id, drawn_on) egyedisége: közben egy másik sorsolás ugyanazt a diákot húzta.
    if ($e->getCode() === '23000') {
        jsonResponse(409, ['error' => 'Közben egy másik sorsolás is futott ebben az osztályban, próbáld újra']);
    }

    throw $e;
}

// 200, ha senki sem volt sorsolható, így új kihúzás sem jött létre.
jsonResponse($students === [] ? 200 : 201, ['drawn_on' => $today, 'students' => $students]);
