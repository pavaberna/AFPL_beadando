<?php

declare(strict_types=1);

// Diáksorsoló - tanári lekérdezések: saját osztályok és az osztály névsora

// A tanárhoz rendelt osztályok névsor szerint.
function listTeacherClasses(PDO $db, int $teacherId): array
{
    $stmt = $db->prepare('SELECT id, name, created_at FROM classes WHERE teacher_id = ? ORDER BY name');
    $stmt->execute([$teacherId]);

    return array_map('normalizeTeacherRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Az osztály azonosítója és tanára, vagy null, ha az osztály nem létezik.
function findClassOwner(PDO $db, int $classId): ?array
{
    $stmt = $db->prepare('SELECT id, teacher_id FROM classes WHERE id = ?');
    $stmt->execute([$classId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row === false ? null : normalizeTeacherRow($row);
}

// Az osztály diákjai névsor szerint, az utolsó kihúzás dátumával (null, ha még nem húzták ki).
function listClassStudents(PDO $db, int $classId): array
{
    $stmt = $db->prepare(
        'SELECT s.id, s.name, s.weight, MAX(h.drawn_on) AS last_drawn_on
        FROM students s
        LEFT JOIN draw_history h ON h.student_id = s.id
        WHERE s.class_id = ?
        GROUP BY s.id
        ORDER BY s.name'
    );
    $stmt->execute([$classId]);

    return array_map('normalizeTeacherRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Az SQLite szövegként adja az azonosítókat és a számokat, ezeket egész számmá alakítjuk.
function normalizeTeacherRow(array $row): array
{
    foreach (['id', 'teacher_id', 'weight'] as $key) {
        if (isset($row[$key])) {
            $row[$key] = (int) $row[$key];
        }
    }

    return $row;
}
