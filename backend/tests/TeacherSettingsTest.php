<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/auth.php';
require_once __DIR__ . '/../src/teacher.php';

final class TeacherSettingsTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_settings_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        unset($this->db);
        $_SESSION = [];

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    private function userColumn(string $username, string $column): mixed
    {
        $stmt = $this->db->prepare("SELECT $column FROM users WHERE username = ?");
        $stmt->execute([$username]);

        return $stmt->fetchColumn();
    }

    private function teacherId(): int
    {
        return (int) $this->userColumn('tanar', 'id');
    }

    public function testUpdateStoresNewNameInDatabase(): void
    {
        $this->assertTrue(updateTeacherDisplayName($this->db, $this->teacherId(), 'Dr. Kovács Anna'));

        $this->assertSame('Dr. Kovács Anna', $this->userColumn('tanar', 'display_name'));
    }

    public function testUpdateWithSameNameStillSucceeds(): void
    {
        $this->assertTrue(updateTeacherDisplayName($this->db, $this->teacherId(), 'Kovács Anna'));
    }

    public function testUpdateChangesOnlyTheGivenTeacher(): void
    {
        $this->db->exec(
            "INSERT INTO users (username, password_hash, display_name, role) VALUES ('masik', 'x', 'Másik', 'teacher')"
        );

        updateTeacherDisplayName($this->db, $this->teacherId(), 'Új Név');

        $this->assertSame('Másik', $this->userColumn('masik', 'display_name'));
        $this->assertSame('Adminisztrátor', $this->userColumn('admin', 'display_name'));
    }

    public function testUpdateDoesNotChangeLoginData(): void
    {
        updateTeacherDisplayName($this->db, $this->teacherId(), 'Új Név');

        $user = login($this->db, 'tanar', 'tanar123');

        $this->assertNotNull($user);
        $this->assertSame('tanar', $user['username']);
    }

    public function testUpdateReturnsFalseForMissingTeacher(): void
    {
        $this->assertFalse(updateTeacherDisplayName($this->db, 9999, 'Új Név'));
    }

    public function testUpdateDoesNotChangeAdmin(): void
    {
        $adminId = (int) $this->userColumn('admin', 'id');

        $this->assertFalse(updateTeacherDisplayName($this->db, $adminId, 'Új Név'));
        $this->assertSame('Adminisztrátor', $this->userColumn('admin', 'display_name'));
    }

    public function testSessionKeepsOtherDataAndReturnsNewName(): void
    {
        $before = login($this->db, 'tanar', 'tanar123');

        $user = setCurrentUserDisplayName('Új Név');

        $this->assertSame('Új Név', $user['display_name']);
        $this->assertSame('Új Név', currentUser()['display_name']);
        $this->assertSame($before['id'], $user['id']);
        $this->assertSame('teacher', $user['role']);
        $this->assertTrue(isAuthorized('teacher'));
    }

    public function testNextLoginGetsNewName(): void
    {
        updateTeacherDisplayName($this->db, $this->teacherId(), 'Új Név');

        $this->assertSame('Új Név', login($this->db, 'tanar', 'tanar123')['display_name']);
    }

    public function testDisplayNameLengthLimitCountsCharactersNotBytes(): void
    {
        $this->assertTrue(isValidDisplayName('A'));
        $this->assertTrue(isValidDisplayName(str_repeat('á', MAX_DISPLAY_NAME_LENGTH)));
        $this->assertFalse(isValidDisplayName(str_repeat('á', MAX_DISPLAY_NAME_LENGTH + 1)));
    }

    public function testDisplayNameMustBeSingleLineAndNotEmpty(): void
    {
        $this->assertFalse(isValidDisplayName(''));
        $this->assertFalse(isValidDisplayName("Kovács\nAnna"));
    }
}
