<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';

final class MigrateTest extends TestCase
{
    private string $dbPath;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_migrate_test_' . uniqid() . '.sqlite';
    }

    protected function tearDown(): void
    {
        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    public function testMigrationCreatesDatabaseFile(): void
    {
        migrate($this->dbPath);

        $this->assertFileExists($this->dbPath);
    }

    public function testMigrationSeedsBaseData(): void
    {
        $db = migrate($this->dbPath);

        $this->assertSame(1, $this->countRows($db, "SELECT COUNT(*) FROM users WHERE role = 'admin'"));
        $this->assertSame(1, $this->countRows($db, "SELECT COUNT(*) FROM users WHERE role = 'teacher'"));
        $this->assertSame(2, $this->countRows($db, 'SELECT COUNT(*) FROM classes'));
        $this->assertSame(8, $this->countRows($db, 'SELECT COUNT(*) FROM students'));
    }

    public function testSeededStudentsHaveDefaultWeight(): void
    {
        $db = migrate($this->dbPath);

        $this->assertSame(8, $this->countRows($db, 'SELECT COUNT(*) FROM students WHERE weight = 10'));
    }

    public function testSeededPasswordsAreHashed(): void
    {
        $db = migrate($this->dbPath);

        $hash = $db->query("SELECT password_hash FROM users WHERE username = 'admin'")->fetchColumn();

        $this->assertNotSame('admin123', $hash);
        $this->assertTrue(password_verify('admin123', $hash));
    }

    public function testMigrationCanRunTwiceWithoutDuplicates(): void
    {
        migrate($this->dbPath);
        $db = migrate($this->dbPath);

        $this->assertSame(2, $this->countRows($db, 'SELECT COUNT(*) FROM users'));
        $this->assertSame(8, $this->countRows($db, 'SELECT COUNT(*) FROM students'));
    }

    public function testCliPrintsMigrationFinished(): void
    {
        $script = escapeshellarg(__DIR__ . '/../database/migrate.php');
        $output = shell_exec(escapeshellarg(PHP_BINARY) . " $script " . escapeshellarg($this->dbPath));

        $this->assertSame('Migration finished', trim((string) $output));
    }

    private function countRows(PDO $db, string $sql): int
    {
        return (int) $db->query($sql)->fetchColumn();
    }
}
