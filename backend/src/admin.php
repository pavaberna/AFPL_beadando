<?php

declare(strict_types=1);

// Diáksorsoló - admin műveletek: tanár, osztály és diák felvétele

// A megadott érték szóközök nélkül, ha nem üres szöveg, különben null.
function cleanString(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $value = trim($value);

    return $value === '' ? null : $value;
}

function usernameTaken(PDO $db, string $username): bool
{
    $stmt = $db->prepare('SELECT 1 FROM users WHERE username = ?');
    $stmt->execute([$username]);

    return $stmt->fetchColumn() !== false;
}

function classNameTaken(PDO $db, string $name): bool
{
    $stmt = $db->prepare('SELECT 1 FROM classes WHERE name = ?');
    $stmt->execute([$name]);

    return $stmt->fetchColumn() !== false;
}

// Igaz, ha a megadott azonosítóval létezik tanár szerepkörű felhasználó.
function teacherExists(PDO $db, int $id): bool
{
    $stmt = $db->prepare("SELECT 1 FROM users WHERE id = ? AND role = 'teacher'");
    $stmt->execute([$id]);

    return $stmt->fetchColumn() !== false;
}

function classExists(PDO $db, int $id): bool
{
    $stmt = $db->prepare('SELECT 1 FROM classes WHERE id = ?');
    $stmt->execute([$id]);

    return $stmt->fetchColumn() !== false;
}

// Új tanár mentése. A felhasználónév egyediségét a hívó ellenőrzi (usernameTaken).
// A jelszóhash nem kerül a visszaadott adatok közé.
function createTeacher(PDO $db, string $username, string $password, string $displayName): array
{
    $stmt = $db->prepare(
        "INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'teacher')"
    );
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $displayName]);

    $stmt = $db->prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?');
    $stmt->execute([(int) $db->lastInsertId()]);

    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

// Új osztály, opcionálisan tanárhoz rendelve (teacher_classes). A név egyediségét és a tanár
// létezését a hívó ellenőrzi.
function createClass(PDO $db, string $name, ?int $teacherId): array
{
    $stmt = $db->prepare('INSERT INTO classes (name) VALUES (?)');
    $stmt->execute([$name]);
    $classId = (int) $db->lastInsertId();

    if ($teacherId !== null) {
        $stmt = $db->prepare('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)');
        $stmt->execute([$teacherId, $classId]);
    }

    $stmt = $db->prepare('SELECT id, name, created_at FROM classes WHERE id = ?');
    $stmt->execute([$classId]);
    $row = normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));

    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'teacher_id' => $teacherId,
        'created_at' => $row['created_at'],
    ];
}

// Új diák felvétele egy osztályba. A súlyt nem adjuk meg, így az adatbázis alapértelmezett
// értéke (10) lesz érvényes. Az osztály létezését a hívó ellenőrzi (classExists).
function createStudent(PDO $db, int $classId, string $name): array
{
    $stmt = $db->prepare('INSERT INTO students (class_id, name) VALUES (?, ?)');
    $stmt->execute([$classId, $name]);

    $stmt = $db->prepare('SELECT id, class_id, name, weight, created_at FROM students WHERE id = ?');
    $stmt->execute([(int) $db->lastInsertId()]);

    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

// Az összes tanár (az adminok nélkül) név szerint rendezve.
function listTeachers(PDO $db): array
{
    $stmt = $db->query(
        "SELECT id, username, display_name, role, created_at FROM users WHERE role = 'teacher' ORDER BY display_name"
    );

    return array_map('normalizeRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Az összes osztály név szerint rendezve. A teachers az osztály összes tanára név szerint. A
// teacher_id és a teacher_name átmenetileg megmarad a régi felület miatt: a legkorábban felvett
// hozzárendelt tanár adatai, vagy null, ha az osztálynak nincs tanára.
function listClasses(PDO $db): array
{
    $teachersByClass = [];
    $links = $db->query(
        'SELECT tc.class_id, u.id, u.display_name
        FROM teacher_classes tc
        JOIN users u ON u.id = tc.teacher_id
        ORDER BY u.display_name, u.id'
    );

    foreach ($links->fetchAll(PDO::FETCH_ASSOC) as $link) {
        $teachersByClass[(int) $link['class_id']][] = [
            'id' => (int) $link['id'],
            'display_name' => $link['display_name'],
        ];
    }

    $classes = $db->query('SELECT id, name, created_at FROM classes ORDER BY name');
    $result = [];

    foreach ($classes->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $row = normalizeRow($row);
        $teachers = $teachersByClass[$row['id']] ?? [];
        $first = $teachers === [] ? null : array_reduce(
            $teachers,
            fn (?array $carry, array $teacher): array => $carry === null || $teacher['id'] < $carry['id'] ? $teacher : $carry
        );

        $result[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'teacher_id' => $first['id'] ?? null,
            'teacher_name' => $first['display_name'] ?? null,
            'created_at' => $row['created_at'],
            'teachers' => $teachers,
        ];
    }

    return $result;
}

// Az SQLite szövegként adja az azonosítókat és a számokat, ezeket egész számmá alakítjuk.
function normalizeRow(array|false $row): array
{
    if ($row === false) {
        return [];
    }

    foreach (['id', 'class_id', 'teacher_id', 'weight'] as $key) {
        if (isset($row[$key])) {
            $row[$key] = (int) $row[$key];
        }
    }

    return $row;
}
