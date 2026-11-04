<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/teacher.php';
require_once __DIR__ . '/../src/draw.php';

final class DrawTest extends TestCase
{
    private const TODAY = '2026-11-03';

    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_draw_test_' . uniqid() . '.sqlite';
        $this->db = migrate($this->dbPath);
    }

    protected function tearDown(): void
    {
        unset($this->db);

        if (file_exists($this->dbPath)) {
            unlink($this->dbPath);
        }
    }

    private function classId(string $name): int
    {
        $stmt = $this->db->prepare('SELECT id FROM classes WHERE name = ?');
        $stmt->execute([$name]);

        return (int) $stmt->fetchColumn();
    }

    // Az osztály diákjainak azonosítója név szerint (a seedelt 9.A: Horváth Lilla, Nagy Péter, ...).
    private function studentIds(string $className): array
    {
        $stmt = $this->db->prepare('SELECT name, id FROM students WHERE class_id = ? ORDER BY name');
        $stmt->execute([$this->classId($className)]);

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_KEY_PAIR));
    }

    private function weight(int $studentId): int
    {
        return (int) $this->db->query("SELECT weight FROM students WHERE id = $studentId")->fetchColumn();
    }

    private function countHistory(string $where = '1'): int
    {
        return (int) $this->db->query("SELECT COUNT(*) FROM draw_history WHERE $where")->fetchColumn();
    }

    private function drawOn(int $studentId, string $date): void
    {
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '$date')");
    }

    // A random helyett: sorban visszaadja a megadott értékeket.
    private function sequence(int ...$values): Closure
    {
        return function (int $max) use (&$values): int {
            return array_shift($values);
        };
    }

    public function testDrawsTheRequestedNumberOfDifferentStudentsFromTheClass(): void
    {
        $classIds = array_values($this->studentIds('9.A'));

        $drawn = drawStudents($this->db, $this->classId('9.A'), 3, [], self::TODAY);

        $ids = array_column($drawn, 'id');
        $this->assertCount(3, $drawn);
        $this->assertCount(3, array_unique($ids));
        $this->assertSame([], array_diff($ids, $classIds));
        $this->assertSame(['id', 'name', 'weight'], array_keys($drawn[0]));
    }

    public function testAbsentStudentsAreNeverDrawn(): void
    {
        $ids = $this->studentIds('9.A');
        $absent = [$ids['Horváth Lilla'], $ids['Nagy Péter'], $ids['Szabó Eszter']];

        $drawn = drawStudents($this->db, $this->classId('9.A'), 1, $absent, self::TODAY);

        $this->assertSame('Tóth Bence', $drawn[0]['name']);
    }

    public function testAbsentIdsOfAnotherClassAreIgnored(): void
    {
        $otherClassStudent = array_values($this->studentIds('10.B'))[0];

        $drawn = drawStudents($this->db, $this->classId('9.A'), 4, [$otherClassStudent], self::TODAY);

        $this->assertCount(4, $drawn);
    }

    public function testStudentsDrawnTodayAreExcludedButEarlierDrawsAreNot(): void
    {
        $ids = $this->studentIds('9.A');
        $this->drawOn($ids['Horváth Lilla'], self::TODAY);
        $this->drawOn($ids['Nagy Péter'], self::TODAY);
        $this->drawOn($ids['Szabó Eszter'], '2026-11-02');

        $drawn = drawStudents($this->db, $this->classId('9.A'), 2, [], self::TODAY);

        $names = array_column($drawn, 'name');
        sort($names);
        $this->assertSame(['Szabó Eszter', 'Tóth Bence'], $names);
    }

    public function testAStudentCanBeDrawnOnlyOnceADay(): void
    {
        drawStudents($this->db, $this->classId('9.A'), 4, [], self::TODAY);

        $this->assertSame([], drawStudents($this->db, $this->classId('9.A'), 1, [], self::TODAY));
        $this->assertSame(4, $this->countHistory());
    }

    public function testTheSameStudentsCanBeDrawnAgainTheNextDay(): void
    {
        drawStudents($this->db, $this->classId('9.A'), 4, [], self::TODAY);

        $drawn = drawStudents($this->db, $this->classId('9.A'), 4, [], '2026-11-04');

        $this->assertCount(4, $drawn);
    }

    public function testDrawsOnlyAsManyAsAreDrawableWhenMoreAreRequested(): void
    {
        $ids = $this->studentIds('9.A');
        $this->drawOn($ids['Horváth Lilla'], self::TODAY);

        $drawn = drawStudents($this->db, $this->classId('9.A'), 3, [$ids['Nagy Péter']], self::TODAY);

        $names = array_column($drawn, 'name');
        sort($names);
        $this->assertSame(['Szabó Eszter', 'Tóth Bence'], $names);
        $this->assertSame(3, $this->countHistory());
        $this->assertFalse($this->db->inTransaction());
    }

    public function testDrawsNobodyWhenEveryoneIsAbsent(): void
    {
        $ids = array_values($this->studentIds('9.A'));

        $this->assertSame([], drawStudents($this->db, $this->classId('9.A'), 2, $ids, self::TODAY));
        $this->assertSame(0, $this->countHistory());
    }

    public function testDrawnStudentsLoseOneWeightAndOthersKeepTheirs(): void
    {
        $ids = $this->studentIds('9.A');
        $absent = [$ids['Nagy Péter'], $ids['Szabó Eszter'], $ids['Tóth Bence']];

        $drawn = drawStudents($this->db, $this->classId('9.A'), 1, $absent, self::TODAY);

        $this->assertSame(9, $drawn[0]['weight']);
        $this->assertSame(9, $this->weight($ids['Horváth Lilla']));
        $this->assertSame(10, $this->weight($ids['Nagy Péter']));
    }

    public function testWeightNeverGoesBelowOne(): void
    {
        $ids = $this->studentIds('9.A');
        $this->db->exec("UPDATE students SET weight = 1 WHERE id = {$ids['Horváth Lilla']}");
        $absent = [$ids['Nagy Péter'], $ids['Szabó Eszter'], $ids['Tóth Bence']];

        $drawn = drawStudents($this->db, $this->classId('9.A'), 1, $absent, self::TODAY);

        $this->assertSame(1, $drawn[0]['weight']);
        $this->assertSame(1, $this->weight($ids['Horváth Lilla']));
    }

    public function testDrawIsRecordedWithTheGivenDay(): void
    {
        $drawn = drawStudents($this->db, $this->classId('9.A'), 2, [], self::TODAY);

        $today = self::TODAY;

        foreach ($drawn as $student) {
            $this->assertSame(1, $this->countHistory("student_id = {$student['id']} AND drawn_on = '$today'"));
        }
        $this->assertSame(2, $this->countHistory());
    }

    public function testOtherClassesAreNotTouched(): void
    {
        drawStudents($this->db, $this->classId('9.A'), 4, [], self::TODAY);

        foreach ($this->studentIds('10.B') as $id) {
            $this->assertSame(10, $this->weight($id));
            $this->assertSame(0, $this->countHistory("student_id = $id"));
        }
    }

    public function testFailedDrawRollsBackEveryChange(): void
    {
        $this->db->exec(
            "CREATE TRIGGER fail_draw BEFORE INSERT ON draw_history WHEN (SELECT COUNT(*) FROM draw_history) >= 1
            BEGIN SELECT RAISE(ABORT, 'teszthiba'); END"
        );

        try {
            drawStudents($this->db, $this->classId('9.A'), 2, [], self::TODAY);
            $this->fail('A hibás sorsolásnak kivételt kell dobnia');
        } catch (PDOException) {
            $this->assertFalse($this->db->inTransaction());
            $this->assertSame(0, $this->countHistory());

            foreach ($this->studentIds('9.A') as $id) {
                $this->assertSame(10, $this->weight($id));
            }
        }
    }

    public function testRandomValueSelectsByWeight(): void
    {
        $students = [
            ['id' => 1, 'name' => 'A', 'weight' => 10],
            ['id' => 2, 'name' => 'B', 'weight' => 1],
            ['id' => 3, 'name' => 'C', 'weight' => 5],
        ];

        // Összesen 16: 1–10 → A, 11 → B, 12–16 → C.
        $this->assertSame([1], array_column(pickWeighted($students, 1, $this->sequence(10)), 'id'));
        $this->assertSame([2], array_column(pickWeighted($students, 1, $this->sequence(11)), 'id'));
        $this->assertSame([3], array_column(pickWeighted($students, 1, $this->sequence(16)), 'id'));
    }

    public function testPickWeightedDrawsWithoutReplacement(): void
    {
        $students = [
            ['id' => 1, 'name' => 'A', 'weight' => 10],
            ['id' => 2, 'name' => 'B', 'weight' => 1],
            ['id' => 3, 'name' => 'C', 'weight' => 5],
        ];

        // 1. kör (össz. 16): 1 → A. 2. kör (B, C, össz. 6): 1 → B. 3. kör (C, össz. 5): 1 → C.
        $picked = pickWeighted($students, 3, $this->sequence(1, 1, 1));

        $this->assertSame([1, 2, 3], array_column($picked, 'id'));
    }

    public function testPickWeightedPassesTheRemainingTotalWeightToRandom(): void
    {
        $students = [
            ['id' => 1, 'name' => 'A', 'weight' => 10],
            ['id' => 2, 'name' => 'B', 'weight' => 1],
        ];
        $maxValues = [];

        pickWeighted($students, 2, function (int $max) use (&$maxValues): int {
            $maxValues[] = $max;

            return 1;
        });

        $this->assertSame([11, 1], $maxValues);
    }

    public function testHeavierStudentsAreDrawnMoreOften(): void
    {
        $students = [
            ['id' => 1, 'name' => 'Nehéz', 'weight' => 10],
            ['id' => 2, 'name' => 'Könnyű', 'weight' => 1],
        ];
        $heavyWins = 0;

        for ($i = 0; $i < 2000; $i++) {
            $heavyWins += pickWeighted($students, 1, fn (int $max): int => random_int(1, $max))[0]['id'] === 1 ? 1 : 0;
        }

        // Elméletileg 10/11 ≈ 91%; a tág határ miatt a teszt nem véletlenszerűen bukik el.
        $this->assertGreaterThan(1700, $heavyWins);
        $this->assertLessThan(1950, $heavyWins);
    }
}
