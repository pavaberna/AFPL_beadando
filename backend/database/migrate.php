<?php

declare(strict_types=1);

// Diáksorsoló - migráció és seed
// Használat: php database/migrate.php [adatbázis fájl útvonala]

const DEFAULT_DB_PATH = __DIR__ . '/database.sqlite';
const SCHEMA_PATH = __DIR__ . '/schema.sql';

// Létrehozza (vagy megnyitja) az adatbázist, lefuttatja a sémát és feltölti alapadatokkal.
function migrate(string $dbPath): PDO
{
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $linkTableExisted = tableExists($db, 'teacher_classes');
    $db->exec((string) file_get_contents(SCHEMA_PATH));

    // A tanár–osztály kapcsolat korábban a classes.teacher_id oszlopban volt. Az átmásolás csak a
    // kapcsolótábla létrehozásakor fut le, különben a később törölt hozzárendelések újra megjelennének.
    if (!$linkTableExisted) {
        $db->exec(
            'INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id)
            SELECT teacher_id, id FROM classes WHERE teacher_id IS NOT NULL'
        );
    }

    // Csak üres adatbázist töltünk fel, így a migráció többször is futtatható.
    $userCount = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($userCount === 0) {
        seed($db);
    }

    return $db;
}

function tableExists(PDO $db, string $name): bool
{
    $stmt = $db->prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
    $stmt->execute([$name]);

    return $stmt->fetchColumn() !== false;
}

// Alapadatok: 1 admin, 1 tanár, 2 osztály, osztályonként 4 diák.
function seed(PDO $db): void
{
    $db->beginTransaction();

    $insertUser = $db->prepare(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    );
    $insertUser->execute(['admin', password_hash('admin123', PASSWORD_DEFAULT), 'Adminisztrátor', 'admin']);
    $insertUser->execute(['tanar', password_hash('tanar123', PASSWORD_DEFAULT), 'Kovács Anna', 'teacher']);
    $teacherId = (int) $db->lastInsertId();

    $classes = [
        '9.A' => ['Nagy Péter', 'Szabó Eszter', 'Tóth Bence', 'Horváth Lilla'],
        '10.B' => ['Kiss Máté', 'Varga Zsófia', 'Molnár Dávid', 'Farkas Réka'],
    ];

    $insertClass = $db->prepare('INSERT INTO classes (name) VALUES (?)');
    $assignClass = $db->prepare('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)');
    $insertStudent = $db->prepare('INSERT INTO students (class_id, name) VALUES (?, ?)');

    foreach ($classes as $className => $students) {
        $insertClass->execute([$className]);
        $classId = (int) $db->lastInsertId();
        $assignClass->execute([$teacherId, $classId]);

        foreach ($students as $studentName) {
            $insertStudent->execute([$classId, $studentName]);
        }
    }

    $db->commit();
}

if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    migrate($argv[1] ?? DEFAULT_DB_PATH);
    echo "Migration finished" . PHP_EOL;
}
