<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/backup.php';

final class BackupTest extends TestCase
{
    private string $workDir;
    private string $dbPath;
    private string $backupDir;

    protected function setUp(): void
    {
        $this->workDir = sys_get_temp_dir() . '/afpl_backup_test_' . uniqid();
        mkdir($this->workDir);
        $this->dbPath = $this->workDir . '/database.sqlite';
        $this->backupDir = $this->workDir . '/backups';
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->workDir);
    }

    public function testBackupContainsTheData(): void
    {
        migrate($this->dbPath);

        $backup = backupDatabase($this->dbPath, $this->backupDir);

        $this->assertFileExists($backup);
        $this->assertSame(8, $this->countStudents($backup));
    }

    public function testBackupFileNameHasTimestamp(): void
    {
        migrate($this->dbPath);

        $backup = backupDatabase($this->dbPath, $this->backupDir);

        $this->assertMatchesRegularExpression(
            '/\/database_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sqlite$/',
            $backup
        );
    }

    public function testBackupPassesIntegrityCheck(): void
    {
        migrate($this->dbPath);

        $backup = new PDO('sqlite:' . backupDatabase($this->dbPath, $this->backupDir));

        $this->assertSame('ok', $backup->query('PRAGMA integrity_check')->fetchColumn());
    }

    public function testBackupIsIndependentFromOriginal(): void
    {
        $db = migrate($this->dbPath);
        $backup = backupDatabase($this->dbPath, $this->backupDir);

        $this->assertSame(8, $this->countStudents($this->dbPath));

        $db->exec("INSERT INTO students (class_id, name) VALUES (1, 'Új Diák')");

        $this->assertSame(9, $this->countStudents($this->dbPath));
        $this->assertSame(8, $this->countStudents($backup));
    }

    public function testBackupLeavesOutUncommittedWrites(): void
    {
        $db = migrate($this->dbPath);
        $db->beginTransaction();
        $db->exec("INSERT INTO students (class_id, name) VALUES (1, 'Új Diák')");

        $backup = backupDatabase($this->dbPath, $this->backupDir);
        $db->rollBack();

        $this->assertSame(8, $this->countStudents($backup));
    }

    public function testCreatesMissingNestedBackupFolder(): void
    {
        migrate($this->dbPath);

        $backup = backupDatabase($this->dbPath, $this->backupDir . '/napi/mentesek');

        $this->assertFileExists($backup);
    }

    public function testMissingDatabaseThrowsAndCreatesNothing(): void
    {
        try {
            backupDatabase($this->dbPath, $this->backupDir);
            $this->fail('A hiányzó adatbázisnak kivételt kell dobnia');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('nem található', $e->getMessage());
            $this->assertFileDoesNotExist($this->dbPath);
            $this->assertDirectoryDoesNotExist($this->backupDir);
        }
    }

    public function testFileThatIsNotDatabaseThrows(): void
    {
        file_put_contents($this->dbPath, str_repeat('ez nem adatbázis, csak szöveg ', 40));

        $this->expectException(PDOException::class);
        backupDatabase($this->dbPath, $this->backupDir);
    }

    public function testCliPrintsBackupFinished(): void
    {
        migrate($this->dbPath);

        [$output, $exitCode] = $this->runCli();

        $this->assertSame(0, $exitCode);
        $this->assertStringStartsWith('Backup finished: ', $output);
        $this->assertCount(1, glob($this->backupDir . '/*.sqlite') ?: []);
    }

    public function testCliFailsOnMissingDatabase(): void
    {
        [$output, $exitCode] = $this->runCli();

        $this->assertSame(1, $exitCode);
        $this->assertStringStartsWith('Backup failed: ', $output);
    }

    // A szkript futtatása külön folyamatként: a kimenet és a kilépési kód.
    private function runCli(): array
    {
        $command = implode(' ', array_map('escapeshellarg', [
            PHP_BINARY,
            __DIR__ . '/../database/backup.php',
            $this->dbPath,
            $this->backupDir,
        ]));
        exec($command . ' 2>&1', $output, $exitCode);

        return [implode("\n", $output), $exitCode];
    }

    private function countStudents(string $path): int
    {
        $db = new PDO('sqlite:' . $path);

        return (int) $db->query('SELECT COUNT(*) FROM students')->fetchColumn();
    }

    private function removeDirectory(string $dir): void
    {
        foreach (glob($dir . '/*') ?: [] as $path) {
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                unlink($path);
            }
        }

        rmdir($dir);
    }
}
