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

// Új osztály, opcionálisan tanárhoz rendelve. A név egyediségét és a tanár létezését a hívó ellenőrzi.
function createClass(PDO $db, string $name, ?int $teacherId): array
{
    $stmt = $db->prepare('INSERT INTO classes (name, teacher_id) VALUES (?, ?)');
    $stmt->execute([$name, $teacherId]);

    $stmt = $db->prepare('SELECT id, name, teacher_id, created_at FROM classes WHERE id = ?');
    $stmt->execute([(int) $db->lastInsertId()]);

    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
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
