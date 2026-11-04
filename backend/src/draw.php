<?php

declare(strict_types=1);

// Diáksorsoló - sorsolás: súlyozott húzás egy osztályból, napi egyszeri kihúzhatósággal

// Az osztály ma még sorsolható diákjai: nincsenek a hiányzók között, és ma még nem húzták ki őket.
// A más osztályba tartozó hiányzó-azonosítók nem számítanak.
function drawableStudents(PDO $db, int $classId, array $absentIds, string $today): array
{
    $stmt = $db->prepare(
        'SELECT s.id, s.name, s.weight
        FROM students s
        WHERE s.class_id = ?
            AND NOT EXISTS (SELECT 1 FROM draw_history h WHERE h.student_id = s.id AND h.drawn_on = ?)
        ORDER BY s.id'
    );
    $stmt->execute([$classId, $today]);
    $absent = array_flip($absentIds);
    $students = [];

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $id = (int) $row['id'];

        if (!isset($absent[$id])) {
            $students[] = ['id' => $id, 'name' => $row['name'], 'weight' => (int) $row['weight']];
        }
    }

    return $students;
}

// Súlyozott húzás visszatevés nélkül: minden körben a megmaradt diákok közül húz, mindegyiket a
// súlyával arányos eséllyel. A random(max) 1 és max közötti egészet ad; a tesztek ezt cserélik le.
function pickWeighted(array $students, int $count, callable $random): array
{
    $picked = [];

    for ($round = 0; $round < $count && $students !== []; $round++) {
        $total = array_sum(array_column($students, 'weight'));
        $target = max(1, min($total, $random($total)));

        foreach ($students as $index => $student) {
            $target -= $student['weight'];

            if ($target <= 0) {
                $picked[] = $student;
                array_splice($students, $index, 1);
                break;
            }
        }
    }

    return $picked;
}

// Kisorsol legfeljebb count darab diákot az osztályból (ha ma kevesebben sorsolhatók, annyit, ahányan
// vannak), a kihúzás sorrendjében adja vissza őket. A kihúzottak súlya 1-gyel csökken (de 1 alá nem
// megy), és a nap (today) bekerül a draw_history táblába. Vagy minden kihúzás rögzül, vagy egyik sem.
function drawStudents(
    PDO $db,
    int $classId,
    int $count,
    array $absentIds,
    string $today,
    ?callable $random = null
): array {
    $random ??= fn (int $max): int => random_int(1, $max);

    $db->beginTransaction();

    try {
        $drawable = drawableStudents($db, $classId, $absentIds, $today);
        $picked = pickWeighted($drawable, $count, $random);
        $lowerWeight = $db->prepare('UPDATE students SET weight = MAX(weight - 1, 1) WHERE id = ?');
        $recordDraw = $db->prepare('INSERT INTO draw_history (student_id, drawn_on) VALUES (?, ?)');

        foreach ($picked as $index => $student) {
            $lowerWeight->execute([$student['id']]);
            $recordDraw->execute([$student['id'], $today]);
            $picked[$index]['weight'] = max($student['weight'] - 1, 1);
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    return $picked;
}
