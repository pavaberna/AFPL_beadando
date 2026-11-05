<?php

declare(strict_types=1);

// Diáksorsoló - tanári műveletek: saját osztályok, az osztály névsora és a név módosítása

const MAX_DISPLAY_NAME_LENGTH = 100;

// Igaz, ha a név egysoros, és legalább 1, legfeljebb MAX_DISPLAY_NAME_LENGTH karakter hosszú.
function isValidDisplayName(string $name): bool
{
    return preg_match('/^\P{Cc}{1,' . MAX_DISPLAY_NAME_LENGTH . '}\z/u', $name) === 1;
}

// A tanár megjelenített nevének módosítása. Hamis, ha nincs ilyen tanár, pl. mert közben törölték.
function updateTeacherDisplayName(PDO $db, int $teacherId, string $displayName): bool
{
    $stmt = $db->prepare("UPDATE users SET display_name = ? WHERE id = ? AND role = 'teacher'");
    $stmt->execute([$displayName, $teacherId]);

    return $stmt->rowCount() > 0;
}

// A mai nap magyar idő szerint, a szerver időzóna-beállításától függetlenül. Ez dönti el, kit
// húztak ki ma (napi egyszeri kihúzhatóság); éjfél után a tegnapi kihúzás már nem számít.
function today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Europe/Budapest')))->format('Y-m-d');
}

// A tanárhoz rendelt osztályok névsor szerint.
function listTeacherClasses(PDO $db, int $teacherId): array
{
    $stmt = $db->prepare(
        'SELECT c.id, c.name, c.created_at
        FROM classes c
        JOIN teacher_classes tc ON tc.class_id = c.id
        WHERE tc.teacher_id = ?
        ORDER BY c.name'
    );
    $stmt->execute([$teacherId]);

    return array_map('normalizeTeacherRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Igaz, ha a tanárhoz hozzá van rendelve az osztály, hamis, ha nincs; null, ha az osztály nem létezik.
function teacherHasClass(PDO $db, int $teacherId, int $classId): ?bool
{
    $stmt = $db->prepare(
        'SELECT EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = ? AND class_id = ?) AS assigned
        FROM classes WHERE id = ?'
    );
    $stmt->execute([$teacherId, $classId, $classId]);
    $assigned = $stmt->fetchColumn();

    return $assigned === false ? null : (bool) $assigned;
}

// Az osztály diákjai névsor szerint, az utolsó kihúzás dátumával (null, ha még nem húzták ki) és azzal,
// hogy ma kihúzták-e (drawn_today).
function listClassStudents(PDO $db, int $classId, ?string $today = null): array
{
    $today ??= today();
    $stmt = $db->prepare(
        'SELECT s.id, s.name, s.weight, MAX(h.drawn_on) AS last_drawn_on
        FROM students s
        LEFT JOIN draw_history h ON h.student_id = s.id
        WHERE s.class_id = ?
        GROUP BY s.id
        ORDER BY s.name'
    );
    $stmt->execute([$classId]);

    return array_map(function (array $row) use ($today): array {
        $student = normalizeTeacherRow($row);
        $student['drawn_today'] = $student['last_drawn_on'] === $today;

        return $student;
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));
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
