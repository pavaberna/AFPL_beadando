<?php

declare(strict_types=1);

// Diáksorsoló - admin műveletek: tanár, osztály és diák felvétele

// A diákok féléves kezdő súlya, megegyezik a students.weight oszlop alapértelmezett értékével.
const INITIAL_STUDENT_WEIGHT = 10;

// A megadott érték szóközök nélkül, ha nem üres szöveg, különben null.
function cleanString(mixed $value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $value = trim($value);

    return $value === '' ? null : $value;
}

// Az exceptId azonosítójú felhasználót nem számítjuk, így módosításkor a saját név nem ütközik.
function usernameTaken(PDO $db, string $username, ?int $exceptId = null): bool
{
    $stmt = $db->prepare('SELECT 1 FROM users WHERE username = ? AND id != ?');
    $stmt->execute([$username, $exceptId ?? 0]);

    return $stmt->fetchColumn() !== false;
}

// Az exceptId azonosítójú osztályt nem számítjuk, így módosításkor a saját név nem ütközik.
function classNameTaken(PDO $db, string $name, ?int $exceptId = null): bool
{
    $stmt = $db->prepare('SELECT 1 FROM classes WHERE name = ? AND id != ?');
    $stmt->execute([$name, $exceptId ?? 0]);

    return $stmt->fetchColumn() !== false;
}

// Igaz, ha az érték egész számokból álló JSON tömb (az üres tömb is az), nem objektum.
function isIntList(mixed $value): bool
{
    return is_array($value) && array_is_list($value) && array_filter($value, 'is_int') === $value;
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
        fn(?string $cell): string => strtolower(trim((string) $cell)),
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

// Az összes tanár (az adminok nélkül) név szerint rendezve, a hozzájuk rendelt osztályok
// azonosítóival (class_ids, növekvő sorrendben). Az id megadásakor csak az az egy tanár.
function listTeachers(PDO $db, ?int $id = null): array
{
    $stmt = $db->prepare(
        "SELECT id, username, display_name, role, created_at FROM users
        WHERE role = 'teacher' AND (? IS NULL OR id = ?) ORDER BY display_name"
    );
    $stmt->execute([$id, $id]);

    $classIds = [];
    $links = $db->query('SELECT teacher_id, class_id FROM teacher_classes ORDER BY class_id');

    foreach ($links->fetchAll(PDO::FETCH_ASSOC) as $link) {
        $classIds[(int) $link['teacher_id']][] = (int) $link['class_id'];
    }

    return array_map(function (array $row) use ($classIds): array {
        $teacher = normalizeRow($row);
        $teacher['class_ids'] = $classIds[$teacher['id']] ?? [];

        return $teacher;
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Tanár módosítása: a changes a username, display_name és password közül azokat tartalmazza, amelyek
// változnak; a classIds (ha nem null) a tanárhoz rendelt osztályok teljes új listája. Az egyediséget,
// a tanár és az osztályok létezését a hívó ellenőrzi.
function updateTeacher(PDO $db, int $id, array $changes, ?array $classIds): void
{
    $columns = [];
    $values = [];

    foreach (['username', 'display_name'] as $column) {
        if (isset($changes[$column])) {
            $columns[] = "$column = ?";
            $values[] = $changes[$column];
        }
    }

    if (isset($changes['password'])) {
        $columns[] = 'password_hash = ?';
        $values[] = password_hash($changes['password'], PASSWORD_DEFAULT);
    }

    $db->beginTransaction();

    try {
        if ($columns !== []) {
            $stmt = $db->prepare('UPDATE users SET ' . implode(', ', $columns) . ' WHERE id = ?');
            $stmt->execute([...$values, $id]);
        }

        if ($classIds !== null) {
            $stmt = $db->prepare('DELETE FROM teacher_classes WHERE teacher_id = ?');
            $stmt->execute([$id]);

            $stmt = $db->prepare('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)');

            foreach (array_unique($classIds) as $classId) {
                $stmt->execute([$id, $classId]);
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

// Tanár törlése: a hozzárendelései megszűnnek, az osztályai megmaradnak.
function deleteTeacher(PDO $db, int $id): void
{
    $stmt = $db->prepare("DELETE FROM users WHERE id = ? AND role = 'teacher'");
    $stmt->execute([$id]);
}

// Osztály átnevezése. A név egyediségét és az osztály létezését a hívó ellenőrzi.
function renameClass(PDO $db, int $id, string $name): void
{
    $stmt = $db->prepare('UPDATE classes SET name = ? WHERE id = ?');
    $stmt->execute([$name, $id]);
}

// Osztály törlése: a diákjai, azok kihúzási előzményei és a tanári hozzárendelései is törlődnek.
function deleteClass(PDO $db, int $id): void
{
    $stmt = $db->prepare('DELETE FROM classes WHERE id = ?');
    $stmt->execute([$id]);
}

function studentExists(PDO $db, int $id): bool
{
    $stmt = $db->prepare('SELECT 1 FROM students WHERE id = ?');
    $stmt->execute([$id]);

    return $stmt->fetchColumn() !== false;
}

// Az osztály diákjai név szerint rendezve.
function listStudents(PDO $db, int $classId): array
{
    $stmt = $db->prepare(
        'SELECT id, class_id, name, weight, created_at FROM students WHERE class_id = ? ORDER BY name'
    );
    $stmt->execute([$classId]);

    return array_map('normalizeRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Diák módosítása: a changes a name, weight és class_id közül azokat tartalmazza, amelyek változnak.
// A diák és az osztály létezését, valamint az értékek érvényességét a hívó ellenőrzi.
function updateStudent(PDO $db, int $id, array $changes): array
{
    $columns = [];
    $values = [];

    foreach (['name', 'weight', 'class_id'] as $column) {
        if (isset($changes[$column])) {
            $columns[] = "$column = ?";
            $values[] = $changes[$column];
        }
    }

    if ($columns !== []) {
        $stmt = $db->prepare('UPDATE students SET ' . implode(', ', $columns) . ' WHERE id = ?');
        $stmt->execute([...$values, $id]);
    }

    $stmt = $db->prepare('SELECT id, class_id, name, weight, created_at FROM students WHERE id = ?');
    $stmt->execute([$id]);

    return normalizeRow($stmt->fetch(PDO::FETCH_ASSOC));
}

// Diák törlése: a kihúzási előzményei is törlődnek.
function deleteStudent(PDO $db, int $id): void
{
    $stmt = $db->prepare('DELETE FROM students WHERE id = ?');
    $stmt->execute([$id]);
}

// Új félév indulásakor minden diák súlyát visszaállítja a kezdőértékre, és visszaadja a diákok számát.
// Egyetlen UPDATE, ezért vagy minden diáknál érvényesül, vagy egyiknél sem. Az előzmények megmaradnak.
function resetAllWeights(PDO $db): int
{
    $stmt = $db->prepare('UPDATE students SET weight = ?');
    $stmt->execute([INITIAL_STUDENT_WEIGHT]);

    return $stmt->rowCount();
}

// Az összes osztály név szerint rendezve. A teachers az osztály összes tanára név szerint. A
// teacher_id és a teacher_name átmenetileg megmarad a régi felület miatt: a legkorábban felvett
// hozzárendelt tanár adatai, vagy null, ha az osztálynak nincs tanára.
function listClasses(PDO $db, ?int $id = null): array
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

    $classes = $db->prepare('SELECT id, name, created_at FROM classes WHERE (? IS NULL OR id = ?) ORDER BY name');
    $classes->execute([$id, $id]);
    $result = [];

    foreach ($classes->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $row = normalizeRow($row);
        $teachers = $teachersByClass[$row['id']] ?? [];
        $first = null;

        foreach ($teachers as $teacher) {
            if ($first === null || $teacher['id'] < $first['id']) {
                $first = $teacher;
            }
        }

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
