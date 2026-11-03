<?php

declare(strict_types=1);

// Diáksorsoló - adatbázis biztonsági mentése
// Használat: php database/backup.php [adatbázis fájl útvonala] [mentési mappa]

require_once __DIR__ . '/migrate.php';

const DEFAULT_BACKUP_DIR = __DIR__ . '/backups';

// Időbélyeggel ellátott másolatot készít az adatbázisról, és visszaadja a mentés útvonalát.
// A VACUUM INTO a folyamatban lévő írások mellett is ép másolatot ad, a fájlmásolással szemben,
// és meglévő fájlt nem ír felül. A mentés jelszóhasheket is tartalmaz, ezért a mappa csak a
// tulajdonosának elérhető.
function backupDatabase(string $dbPath, string $backupDir): string
{
    if (!is_file($dbPath)) {
        throw new RuntimeException("Az adatbázis nem található: $dbPath");
    }

    if (!is_dir($backupDir) && !mkdir($backupDir, 0700, true)) {
        throw new RuntimeException("A mentési mappa nem hozható létre: $backupDir");
    }

    $target = $backupDir . '/database_' . date('Y-m-d_H-i-s') . '.sqlite';

    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->prepare('VACUUM INTO ?')->execute([$target]);

    return $target;
}

if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    try {
        $target = backupDatabase($argv[1] ?? DEFAULT_DB_PATH, $argv[2] ?? DEFAULT_BACKUP_DIR);
        echo "Backup finished: $target" . PHP_EOL;
    } catch (Throwable $e) {
        fwrite(STDERR, 'Backup failed: ' . $e->getMessage() . PHP_EOL);
        exit(1);
    }
}
