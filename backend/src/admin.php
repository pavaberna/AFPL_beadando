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

// A CSV tartalmából kiolvassa a diákok neveit. Az első sor a fejléc, ebben kell lennie egy
// nev, név vagy name oszlopnak; az elválasztó ; vagy , lehet. Hibás fájlnál kivételt dob.
function parseStudentCsv(string $content): array
{
    if (str_starts_with($content, "\xEF\xBB\xBF")) {
        $content = substr($content, 3);
    }

    // Érvénytelen UTF-8 szövegre a /u módú preg_match false értéket ad.
    if (preg_match('//u', $content) !== 1) {
        throw new InvalidArgumentException('A fájl nem UTF-8 kódolású (Excelben: "CSV UTF-8" mentés)');
    }

    $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
    $separator = str_contains($lines[0], ';') ? ';' : ',';
    $columns = array_map(
        fn (?string $cell): string => strtolower(trim((string) $cell)),
        str_getcsv($lines[0], $separator, '"', '')
    );
    $nameColumn = array_key_first(array_intersect($columns, ['nev', 'név', 'name']));

    if ($nameColumn === null) {
        throw new InvalidArgumentException('A fájl első sorában kell lennie nev vagy name oszlopnak');
    }

    $names = [];

    foreach (array_slice($lines, 1, null, true) as $index => $line) {
        $cells = str_getcsv($line, $separator, '"', '');
        $name = cleanString($cells[$nameColumn] ?? null);
        $row = $index + 1;

        // Több cella a fejlécnél: a névben idézőjel nélküli elválasztó van, ezért csonkulna.
        if (count($cells) > count($columns)) {
            throw new InvalidArgumentException("A(z) $row. sorban több oszlop van, mint a fejlécben");
        }

        if ($name !== null) {
            $names[] = $name;
        } elseif (trim(implode('', $cells)) !== '') {
            throw new InvalidArgumentException("A(z) $row. sorból hiányzik a név");
        }
    }

    if ($names === []) {
        throw new InvalidArgumentException('A fájl nem tartalmaz diákot');
    }

    return $names;
}

// Diákok tömeges felvétele egy osztályba: vagy mindegyik bekerül, vagy egyik sem. Az osztályban
// már szereplő és a listában ismétlődő nevek kimaradnak. Az osztály létezését a hívó ellenőrzi.
function importStudents(PDO $db, int $classId, array $names): array
{
    $stmt = $db->prepare('SELECT name FROM students WHERE class_id = ?');
    $stmt->execute([$classId]);
    $known = array_fill_keys($stmt->fetchAll(PDO::FETCH_COLUMN), true);
    $result = ['imported' => [], 'skipped' => []];

    $db->beginTransaction();

    try {
        foreach ($names as $name) {
            if (isset($known[$name])) {
                $result['skipped'][] = $name;
                continue;
            }

            $result['imported'][] = createStudent($db, $classId, $name);
            $known[$name] = true;
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    return $result;
}

// Az összes tanár (az adminok nélkül) név szerint rendezve.
function listTeachers(PDO $db): array
{
    $stmt = $db->query(
        "SELECT id, username, display_name, role, created_at FROM users WHERE role = 'teacher' ORDER BY display_name"
    );

    return array_map('normalizeRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Az összes osztály név szerint rendezve, a hozzárendelt tanár nevével (null, ha nincs tanára).
function listClasses(PDO $db): array
{
    $stmt = $db->query(
        'SELECT c.id, c.name, c.teacher_id, u.display_name AS teacher_name, c.created_at
        FROM classes c
        LEFT JOIN users u ON u.id = c.teacher_id
        ORDER BY c.name'
    );

    return array_map('normalizeRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
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
