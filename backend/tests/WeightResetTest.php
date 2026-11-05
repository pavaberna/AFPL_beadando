<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/admin.php';

final class WeightResetTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_weight_reset_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
    }

    protected function tearDown(): void
    {
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    private function weights(): array
    {
        return array_map(
            'intval',
            $this->db->query('SELECT weight FROM students')->fetchAll(PDO::FETCH_COLUMN)
        );
    }

    public function testResetSetsEveryStudentInEveryClassBackToTen(): void
    {
        // A seed mindkét osztályban vesz fel diákokat, így az osztályok közti hatás is látszik.
        $this->db->exec('UPDATE students SET weight = 3');
        $this->db->exec("UPDATE students SET weight = 25 WHERE name = 'Kiss Máté'");

        resetAllWeights($this->db);

        $this->assertSame(array_fill(0, 8, 10), $this->weights());
    }

    public function testResetReturnsTheNumberOfStudents(): void
    {
        // Azokat is beleszámolja, akiknek a súlya eleve 10 volt.
        $this->db->exec("UPDATE students SET weight = 3 WHERE name = 'Nagy Péter'");

        $this->assertSame(8, resetAllWeights($this->db));
    }

    public function testResetWithoutStudentsReturnsZero(): void
    {
        $this->db->exec('DELETE FROM students');

        $this->assertSame(0, resetAllWeights($this->db));
    }

    public function testResetKeepsTheDrawHistory(): void
    {
        $this->db->exec(
            "INSERT INTO draw_history (student_id, drawn_on) SELECT id, '2026-11-03' FROM students LIMIT 1"
        );

        resetAllWeights($this->db);

        $this->assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM draw_history')->fetchColumn());
    }
}
