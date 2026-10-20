<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class SchemaTest extends TestCase
{
    private const SCHEMA_PATH = __DIR__ . '/../database/schema.sql';

    private PDO $db;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec((string) file_get_contents(self::SCHEMA_PATH));
    }

    public function testSchemaFileExists(): void
    {
        $this->assertFileExists(self::SCHEMA_PATH);
    }

    public function testSchemaCreatesAllTables(): void
    {
        $tables = $this->db
            ->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            ->fetchAll(PDO::FETCH_COLUMN);

        $this->assertSame(['classes', 'draw_history', 'students', 'users'], $tables);
    }

    public function testSchemaCanBeAppliedTwice(): void
    {
        $this->db->exec((string) file_get_contents(self::SCHEMA_PATH));
        $this->addToAssertionCount(1);
    }

    public function testStudentWeightDefaultsToTen(): void
    {
        $classId = $this->createClass();
        $this->db->exec("INSERT INTO students (class_id, name) VALUES ($classId, 'Teszt Diák')");

        $weight = $this->db->query('SELECT weight FROM students')->fetchColumn();

        $this->assertSame(10, (int) $weight);
    }

    public function testStudentWeightCannotGoBelowOne(): void
    {
        $classId = $this->createClass();
        $this->db->exec("INSERT INTO students (class_id, name) VALUES ($classId, 'Teszt Diák')");

        $this->expectException(PDOException::class);
        $this->db->exec('UPDATE students SET weight = 0');
    }

    public function testStudentCannotBeDrawnTwiceOnSameDay(): void
    {
        $classId = $this->createClass();
        $this->db->exec("INSERT INTO students (class_id, name) VALUES ($classId, 'Teszt Diák')");
        $studentId = (int) $this->db->lastInsertId();
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-10-20')");

        $this->expectException(PDOException::class);
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-10-20')");
    }

    private function createClass(): int
    {
        $this->db->exec("INSERT INTO classes (name) VALUES ('9.A')");

        return (int) $this->db->lastInsertId();
    }
}
