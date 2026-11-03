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

        $this->assertSame(
            ['id', 'username', 'display_name', 'role', 'created_at', 'class_ids'],
            array_keys($teacher)
        );
        $this->assertIsInt($teacher['id']);
    }

    public function testListTeachersReturnsClassIdsOfTheTeacher(): void
    {
        $teacher = listTeachers($this->db)[0];
        $classIds = array_column(listClasses($this->db), 'id');
        sort($classIds);

        $this->assertSame($classIds, $teacher['class_ids']);
    }

    public function testListTeachersHasEmptyClassIdsWithoutClasses(): void
    {
        $new = createTeacher($this->db, 'uj-tanar', 'titok123', 'Bakos Tamás');

        $this->assertSame([], listTeachers($this->db, $new['id'])[0]['class_ids']);
    }

    public function testListTeachersCanBeLimitedToOneTeacher(): void
    {
        createTeacher($this->db, 'uj-tanar', 'titok123', 'Bakos Tamás');
        $id = listTeachers($this->db)[1]['id'];

        $this->assertSame([$id], array_column(listTeachers($this->db, $id), 'id'));
        $this->assertSame([], listTeachers($this->db, 999));
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
        $this->assertSame(
            ['id', 'name', 'teacher_id', 'teacher_name', 'created_at', 'teachers'],
            array_keys($classes[0])
        );
        $this->assertIsInt($classes[0]['id']);
        $this->assertIsInt($classes[0]['teacher_id']);
    }

    public function testListClassesIncludesClassWithoutTeacher(): void
    {
        createClass($this->db, '11.C', null);

        $class = $this->findClass('11.C');

        $this->assertNull($class['teacher_id']);
        $this->assertNull($class['teacher_name']);
        $this->assertSame([], $class['teachers']);
    }

    public function testListClassesReturnsTheTeachersOfTheClass(): void
    {
        $class = $this->findClass('9.A');

        $this->assertCount(1, $class['teachers']);
        $this->assertSame(['id', 'display_name'], array_keys($class['teachers'][0]));
        $this->assertSame('Kovács Anna', $class['teachers'][0]['display_name']);
        $this->assertIsInt($class['teachers'][0]['id']);
    }

    public function testListClassesReturnsEveryTeacherOfASharedClass(): void
    {
        $second = createTeacher($this->db, 'masodik', 'titok123', 'Bakos Tamás');
        $classId = $this->findClass('9.A')['id'];
        $this->db->exec("INSERT INTO teacher_classes (teacher_id, class_id) VALUES ({$second['id']}, $classId)");

        $class = $this->findClass('9.A');

        $this->assertSame(['Bakos Tamás', 'Kovács Anna'], array_column($class['teachers'], 'display_name'));
        // A régi mezők a legkorábban felvett tanárt adják (itt Kovács Anna, a seedelt tanár).
        $this->assertSame('Kovács Anna', $class['teacher_name']);
        $this->assertSame($class['teachers'][1]['id'], $class['teacher_id']);
    }

    private function findClass(string $name): array
    {
        return array_values(array_filter(listClasses($this->db), fn (array $c) => $c['name'] === $name))[0];
    }
}
