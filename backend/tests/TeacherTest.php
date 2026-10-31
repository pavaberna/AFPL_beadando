<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/teacher.php';

final class TeacherTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_teacher_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
    }

    protected function tearDown(): void
    {
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    private function teacherId(): int
    {
        return (int) $this->db->query("SELECT id FROM users WHERE username = 'tanar'")->fetchColumn();
    }

    private function classId(string $name): int
    {
        $stmt = $this->db->prepare('SELECT id FROM classes WHERE name = ?');
        $stmt->execute([$name]);

        return (int) $stmt->fetchColumn();
    }

    public function testListTeacherClassesReturnsOnlyOwnClasses(): void
    {
        $this->db->exec(
            "INSERT INTO users (username, password_hash, display_name, role) VALUES ('masik', 'x', 'Másik', 'teacher')"
        );
        $otherId = (int) $this->db->lastInsertId();
        $this->db->exec("INSERT INTO classes (name, teacher_id) VALUES ('11.C', $otherId)");

        $classes = listTeacherClasses($this->db, $this->teacherId());

        $this->assertSame(['10.B', '9.A'], array_column($classes, 'name'));
    }

    public function testListTeacherClassesIsEmptyWithoutClasses(): void
    {
        $this->assertSame([], listTeacherClasses($this->db, 999));
    }

    public function testClassFieldsAreReturnedWithIntegerId(): void
    {
        $class = listTeacherClasses($this->db, $this->teacherId())[1];

        $this->assertSame(['id', 'name', 'created_at'], array_keys($class));
        $this->assertSame($this->classId('9.A'), $class['id']);
    }

    public function testListClassStudentsReturnsNamesIdsAndWeights(): void
    {
        $students = listClassStudents($this->db, $this->classId('9.A'));

        $this->assertCount(4, $students);
        $this->assertSame(['id', 'name', 'weight', 'last_drawn_on'], array_keys($students[0]));
        $this->assertSame('Horváth Lilla', $students[0]['name']);
        $this->assertSame(10, $students[0]['weight']);
        $this->assertIsInt($students[0]['id']);
    }

    public function testListClassStudentsOnlyReturnsStudentsOfThatClass(): void
    {
        $names = array_column(listClassStudents($this->db, $this->classId('10.B')), 'name');

        $this->assertContains('Kiss Máté', $names);
        $this->assertNotContains('Nagy Péter', $names);
    }

    public function testLastDrawnOnIsNullWhenNeverDrawn(): void
    {
        $students = listClassStudents($this->db, $this->classId('9.A'));

        $this->assertNull($students[0]['last_drawn_on']);
    }

    public function testLastDrawnOnIsTheLatestDrawDate(): void
    {
        $studentId = listClassStudents($this->db, $this->classId('9.A'))[0]['id'];
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-09-01')");
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-10-05')");

        $students = listClassStudents($this->db, $this->classId('9.A'));

        $this->assertSame('2026-10-05', $students[0]['last_drawn_on']);
        $this->assertCount(4, $students);
    }

    public function testFindClassOwner(): void
    {
        $classId = $this->classId('9.A');

        $this->assertSame(
            ['id' => $classId, 'teacher_id' => $this->teacherId()],
            findClassOwner($this->db, $classId)
        );
        $this->assertNull(findClassOwner($this->db, 999));
    }
}
