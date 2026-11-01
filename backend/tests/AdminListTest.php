<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/admin.php';

final class AdminListTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_admin_list_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
    }

    protected function tearDown(): void
    {
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    public function testListTeachersReturnsOnlyTeachers(): void
    {
        $teachers = listTeachers($this->db);

        $this->assertCount(1, $teachers);
        $this->assertSame('tanar', $teachers[0]['username']);
        $this->assertSame('teacher', $teachers[0]['role']);
    }

    public function testListTeachersHasExpectedFieldsWithoutPasswordHash(): void
    {
        $teacher = listTeachers($this->db)[0];

        $this->assertSame(['id', 'username', 'display_name', 'role', 'created_at'], array_keys($teacher));
        $this->assertIsInt($teacher['id']);
    }

    public function testListTeachersIncludesNewlyCreatedTeacher(): void
    {
        createTeacher($this->db, 'uj-tanar', 'titok123', 'Bakos Tamás');

        $names = array_column(listTeachers($this->db), 'display_name');

        $this->assertSame(['Bakos Tamás', 'Kovács Anna'], $names);
    }

    public function testListClassesReturnsAllClassesWithTeacherName(): void
    {
        $classes = listClasses($this->db);

        $this->assertSame(['10.B', '9.A'], array_column($classes, 'name'));
        $this->assertSame('Kovács Anna', $classes[0]['teacher_name']);
        $this->assertSame(['id', 'name', 'teacher_id', 'teacher_name', 'created_at'], array_keys($classes[0]));
        $this->assertIsInt($classes[0]['id']);
        $this->assertIsInt($classes[0]['teacher_id']);
    }

    public function testListClassesIncludesClassWithoutTeacher(): void
    {
        createClass($this->db, '11.C', null);

        $class = array_values(array_filter(listClasses($this->db), fn (array $c) => $c['name'] === '11.C'))[0];

        $this->assertNull($class['teacher_id']);
        $this->assertNull($class['teacher_name']);
    }
}
