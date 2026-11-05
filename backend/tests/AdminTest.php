<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/auth.php';
require_once __DIR__ . '/../src/admin.php';

final class AdminTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_admin_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
        $this->db->exec('PRAGMA foreign_keys = ON');
    }

    protected function tearDown(): void
    {
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    public function testNewStudentGetsDefaultWeightOfTen(): void
    {
        $class = createClass($this->db, '11.C', null);
        $student = createStudent($this->db, $class['id'], 'Új Diák');

        $this->assertSame(10, $student['weight']);
        $this->assertSame($class['id'], $student['class_id']);
        $this->assertSame('Új Diák', $student['name']);
    }

    public function testStudentWeightIsStoredAsTenInDatabase(): void
    {
        $class = createClass($this->db, '11.C', null);
        $student = createStudent($this->db, $class['id'], 'Új Diák');

        $stmt = $this->db->prepare('SELECT weight FROM students WHERE id = ?');
        $stmt->execute([$student['id']]);

        $this->assertSame(10, (int) $stmt->fetchColumn());
    }

    public function testCreateTeacherStoresTeacherRole(): void
    {
        $teacher = createTeacher($this->db, 'uj-tanar', 'titok123', 'Új Tanár');

        $this->assertSame('uj-tanar', $teacher['username']);
        $this->assertSame('teacher', $teacher['role']);
        $this->assertSame('Új Tanár', $teacher['display_name']);
    }

    public function testCreatedTeacherCanLogIn(): void
    {
        createTeacher($this->db, 'uj-tanar', 'titok123', 'Új Tanár');
        $_SESSION = [];

        $user = login($this->db, 'uj-tanar', 'titok123');

        $this->assertNotNull($user);
        $this->assertSame('teacher', $user['role']);
        $_SESSION = [];
    }

    public function testCreatedTeacherDoesNotExposePasswordHash(): void
    {
        $teacher = createTeacher($this->db, 'uj-tanar', 'titok123', 'Új Tanár');

        $this->assertArrayNotHasKey('password_hash', $teacher);
    }

    public function testPasswordIsStoredHashed(): void
    {
        $teacher = createTeacher($this->db, 'uj-tanar', 'titok123', 'Új Tanár');

        $stmt = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$teacher['id']]);

        $this->assertNotSame('titok123', $stmt->fetchColumn());
    }

    public function testUsernameTakenDetectsExistingUser(): void
    {
        $this->assertTrue(usernameTaken($this->db, 'admin'));
        $this->assertFalse(usernameTaken($this->db, 'nincs-ilyen'));
    }

    public function testCreateClassAssignsTeacher(): void
    {
        $teacher = createTeacher($this->db, 'uj-tanar', 'titok123', 'Új Tanár');
        $class = createClass($this->db, '12.D', $teacher['id']);

        $this->assertSame('12.D', $class['name']);
        $this->assertSame($teacher['id'], $class['teacher_id']);
        $this->assertSame(['id', 'name', 'teacher_id', 'created_at'], array_keys($class));
        $this->assertSame(1, $this->countLinks($teacher['id'], $class['id']));
    }

    public function testCreateClassWithoutTeacherCreatesNoLink(): void
    {
        $class = createClass($this->db, '12.D', null);

        $links = $this->db->query("SELECT COUNT(*) FROM teacher_classes WHERE class_id = {$class['id']}");

        $this->assertSame(0, (int) $links->fetchColumn());
    }

    public function testClassCanBelongToSeveralTeachersAndViceVersa(): void
    {
        $first = createTeacher($this->db, 'elso', 'titok123', 'Első Tanár');
        $second = createTeacher($this->db, 'masodik', 'titok123', 'Második Tanár');
        $classA = createClass($this->db, '12.D', $first['id']);
        $classB = createClass($this->db, '12.E', $first['id']);
        $this->db->exec("INSERT INTO teacher_classes (teacher_id, class_id) VALUES ({$second['id']}, {$classA['id']})");

        $this->assertSame(1, $this->countLinks($first['id'], $classA['id']));
        $this->assertSame(1, $this->countLinks($first['id'], $classB['id']));
        $this->assertSame(1, $this->countLinks($second['id'], $classA['id']));
    }

    public function testSameAssignmentCannotBeStoredTwice(): void
    {
        $teacher = createTeacher($this->db, 'elso', 'titok123', 'Első Tanár');
        $class = createClass($this->db, '12.D', $teacher['id']);

        $this->expectException(PDOException::class);
        $this->db->exec("INSERT INTO teacher_classes (teacher_id, class_id) VALUES ({$teacher['id']}, {$class['id']})");
    }

    public function testDeletingTeacherRemovesLinksButKeepsClass(): void
    {
        $teacher = createTeacher($this->db, 'elso', 'titok123', 'Első Tanár');
        $class = createClass($this->db, '12.D', $teacher['id']);

        $this->db->exec("DELETE FROM users WHERE id = {$teacher['id']}");

        $this->assertSame(0, $this->countLinks($teacher['id'], $class['id']));
        $this->assertTrue(classExists($this->db, $class['id']));
    }

    public function testDeletingClassRemovesLinksButKeepsOtherTeachers(): void
    {
        $teacher = createTeacher($this->db, 'elso', 'titok123', 'Első Tanár');
        $class = createClass($this->db, '12.D', $teacher['id']);

        $this->db->exec("DELETE FROM classes WHERE id = {$class['id']}");

        $this->assertSame(0, $this->countLinks($teacher['id'], $class['id']));
        $this->assertTrue(teacherExists($this->db, $teacher['id']));
    }

    private function countLinks(int $teacherId, int $classId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM teacher_classes WHERE teacher_id = ? AND class_id = ?');
        $stmt->execute([$teacherId, $classId]);

        return (int) $stmt->fetchColumn();
    }

    public function testCreateClassWithoutTeacher(): void
    {
        $class = createClass($this->db, '12.D', null);

        $this->assertNull($class['teacher_id']);
    }

    public function testClassNameTakenDetectsExistingClass(): void
    {
        $this->assertTrue(classNameTaken($this->db, '9.A'));
        $this->assertFalse(classNameTaken($this->db, '12.D'));
    }

    public function testTeacherExistsOnlyForTeacherRole(): void
    {
        $adminId = (int) $this->db->query("SELECT id FROM users WHERE username = 'admin'")->fetchColumn();
        $teacherId = (int) $this->db->query("SELECT id FROM users WHERE username = 'tanar'")->fetchColumn();

        $this->assertTrue(teacherExists($this->db, $teacherId));
        $this->assertFalse(teacherExists($this->db, $adminId));
        $this->assertFalse(teacherExists($this->db, 9999));
    }

    public function testClassExists(): void
    {
        $class = createClass($this->db, '12.D', null);

        $this->assertTrue(classExists($this->db, $class['id']));
        $this->assertFalse(classExists($this->db, 9999));
    }

    public function testCleanStringTrimsAndRejectsEmptyValues(): void
    {
        $this->assertSame('Anna', cleanString('  Anna '));
        $this->assertNull(cleanString('   '));
        $this->assertNull(cleanString(''));
        $this->assertNull(cleanString(42));
        $this->assertNull(cleanString(null));
    }
}
