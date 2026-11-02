<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/admin.php';

final class StudentImportTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_import_test_' . uniqid() . '.sqlite';
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

    private function countStudents(int $classId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM students WHERE class_id = ?');
        $stmt->execute([$classId]);

        return (int) $stmt->fetchColumn();
    }

    public function testParsesCommaSeparatedFile(): void
    {
        $this->assertSame(['Kiss Anna', 'Őri Ödön'], parseStudentCsv("name\nKiss Anna\nŐri Ödön\n"));
    }

    public function testParsesSemicolonSeparatedExcelFile(): void
    {
        $csv = "\xEF\xBB\xBFkod;Név;email\r\n1;Kiss Anna;a@x.hu\r\n2;Őri Ödön;b@x.hu\r\n";

        $this->assertSame(['Kiss Anna', 'Őri Ödön'], parseStudentCsv($csv));
    }

    public function testKeepsCommaInsideQuotedName(): void
    {
        $this->assertSame(['Kiss, Anna'], parseStudentCsv("name\n\"Kiss, Anna\"\n"));
    }

    public function testIgnoresBlankRowsAndTrimsNames(): void
    {
        $this->assertSame(['Kiss Anna', 'Tóth Béla'], parseStudentCsv("nev;kod\n  Kiss Anna ;1\n\n;\nTóth Béla;2\n"));
    }

    public function testRejectsMissingNameColumn(): void
    {
        $this->expectException(InvalidArgumentException::class);
        parseStudentCsv("azonosito\n1\n");
    }

    public function testRejectsRowWithoutNameAndReportsItsLine(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('3. sorból');
        parseStudentCsv("nev;kod\nKiss Anna;1\n;2\n");
    }

    public function testRejectsUnquotedSeparatorInsideName(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('2. sorban');
        parseStudentCsv("name\nKiss, Anna\n");
    }

    public function testRejectsNonUtf8File(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('UTF-8');
        // Windows-1250 kódolású "Őri": az Ő bájtja 0xD5.
        parseStudentCsv("nev\n\xD5ri\n");
    }

    public function testRejectsFileWithoutStudents(): void
    {
        $this->expectException(InvalidArgumentException::class);
        parseStudentCsv("nev\n\n");
    }

    public function testRejectsEmptyFile(): void
    {
        $this->expectException(InvalidArgumentException::class);
        parseStudentCsv('');
    }

    public function testImportedStudentsGetDefaultWeight(): void
    {
        $class = createClass($this->db, '11.C', null);
        $result = importStudents($this->db, $class['id'], ['Kiss Anna', 'Tóth Béla']);

        $this->assertCount(2, $result['imported']);
        $this->assertSame([], $result['skipped']);
        $this->assertSame(10, $result['imported'][0]['weight']);
        $this->assertSame($class['id'], $result['imported'][1]['class_id']);
        $this->assertSame(2, $this->countStudents($class['id']));
    }

    public function testSkipsNamesAlreadyInClass(): void
    {
        $class = createClass($this->db, '11.C', null);
        createStudent($this->db, $class['id'], 'Kiss Anna');

        $result = importStudents($this->db, $class['id'], ['Kiss Anna', 'Tóth Béla']);

        $this->assertSame(['Kiss Anna'], $result['skipped']);
        $this->assertSame('Tóth Béla', $result['imported'][0]['name']);
        $this->assertSame(2, $this->countStudents($class['id']));
    }

    public function testSkipsNamesRepeatedInFile(): void
    {
        $class = createClass($this->db, '11.C', null);
        $result = importStudents($this->db, $class['id'], ['Kiss Anna', 'Kiss Anna']);

        $this->assertCount(1, $result['imported']);
        $this->assertSame(['Kiss Anna'], $result['skipped']);
    }

    public function testSameNameInAnotherClassIsNotSkipped(): void
    {
        $first = createClass($this->db, '11.C', null);
        $second = createClass($this->db, '11.D', null);
        createStudent($this->db, $first['id'], 'Kiss Anna');

        $result = importStudents($this->db, $second['id'], ['Kiss Anna']);

        $this->assertCount(1, $result['imported']);
        $this->assertSame([], $result['skipped']);
    }

    public function testImportingSameFileTwiceAddsNothing(): void
    {
        $class = createClass($this->db, '11.C', null);
        importStudents($this->db, $class['id'], ['Kiss Anna', 'Tóth Béla']);

        $result = importStudents($this->db, $class['id'], ['Kiss Anna', 'Tóth Béla']);

        $this->assertSame([], $result['imported']);
        $this->assertSame(['Kiss Anna', 'Tóth Béla'], $result['skipped']);
        $this->assertSame(2, $this->countStudents($class['id']));
    }

    // A fájlban a Kiss Anna kétszer szerepel, a Nagy Péter pedig már tagja a seedelt 9.A osztálynak.
    public function testImportsSampleCsvFile(): void
    {
        $classId = (int) $this->db->query("SELECT id FROM classes WHERE name = '9.A'")->fetchColumn();
        $names = parseStudentCsv((string) file_get_contents(__DIR__ . '/fixtures/students-import.csv'));

        $result = importStudents($this->db, $classId, $names);

        $this->assertSame(['Kiss Anna', 'Tóth Béla', 'Őri Ödön'], array_column($result['imported'], 'name'));
        $this->assertSame(['Nagy Péter', 'Kiss Anna'], $result['skipped']);
        $this->assertSame(7, $this->countStudents($classId));
    }

    public function testFailedImportRollsBackEveryStudent(): void
    {
        $class = createClass($this->db, '11.C', null);
        $this->db->exec(
            "CREATE TRIGGER fail_import BEFORE INSERT ON students WHEN NEW.name = 'Hibás'
            BEGIN SELECT RAISE(ABORT, 'teszthiba'); END"
        );

        try {
            importStudents($this->db, $class['id'], ['Kiss Anna', 'Hibás']);
            $this->fail('A hibás importnak kivételt kell dobnia');
        } catch (PDOException) {
            $this->assertFalse($this->db->inTransaction());
            $this->assertSame(0, $this->countStudents($class['id']));
        }
    }
}
