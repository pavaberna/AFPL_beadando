<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/auth.php';

final class AuthTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_auth_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    public function testLoginWithCorrectAdminCredentials(): void
    {
        $user = login($this->db, 'admin', 'admin123');

        $this->assertNotNull($user);
        $this->assertSame('admin', $user['username']);
        $this->assertSame('admin', $user['role']);
        $this->assertSame($user, currentUser());
    }

    public function testLoginWithCorrectTeacherCredentials(): void
    {
        $user = login($this->db, 'tanar', 'tanar123');

        $this->assertNotNull($user);
        $this->assertSame('teacher', $user['role']);
        $this->assertSame('Kovács Anna', $user['display_name']);
    }

    public function testLoginWithWrongPasswordFails(): void
    {
        $this->assertNull(login($this->db, 'admin', 'rossz-jelszo'));
        $this->assertNull(currentUser());
    }

    public function testLoginWithUnknownUserFails(): void
    {
        $this->assertNull(login($this->db, 'nincs-ilyen', 'admin123'));
        $this->assertNull(currentUser());
    }

    public function testLoginWithEmptyCredentialsFails(): void
    {
        $this->assertNull(login($this->db, '', ''));
        $this->assertNull(currentUser());
    }

    public function testLoggedInUserDoesNotExposePasswordHash(): void
    {
        $user = login($this->db, 'admin', 'admin123');

        $this->assertArrayNotHasKey('password_hash', $user);
        $this->assertArrayNotHasKey('password_hash', currentUser());
    }

    public function testFailedLoginDoesNotOverwriteExistingSession(): void
    {
        login($this->db, 'admin', 'admin123');
        login($this->db, 'admin', 'rossz-jelszo');

        $this->assertSame('admin', currentUser()['username']);
    }

    public function testLogoutClearsSession(): void
    {
        login($this->db, 'admin', 'admin123');
        logout();

        $this->assertNull(currentUser());
    }

    public function testRoleCheckDistinguishesAdminAndTeacher(): void
    {
        login($this->db, 'tanar', 'tanar123');

        $this->assertTrue(isAuthorized());
        $this->assertTrue(isAuthorized('teacher'));
        $this->assertFalse(isAuthorized('admin'));

        login($this->db, 'admin', 'admin123');

        $this->assertTrue(isAuthorized('admin'));
        $this->assertFalse(isAuthorized('teacher'));
    }

    public function testNobodyIsAuthorizedWithoutLogin(): void
    {
        $this->assertFalse(isAuthorized());
        $this->assertFalse(isAuthorized('admin'));
    }
}
