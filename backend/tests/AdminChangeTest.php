<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../database/migrate.php';
require_once __DIR__ . '/../src/admin.php';

final class AdminChangeTest extends TestCase
{
    private string $dbPath;
    private PDO $db;

    protected function setUp(): void
    {
        $this->dbPath = sys_get_temp_dir() . '/afpl_admin_change_test_' . uniqid() . '.sqlite';
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

    private function seededTeacherId(): int
    {
        return (int) $this->db->query("SELECT id FROM users WHERE username = 'tanar'")->fetchColumn();
    }

    private function classId(string $name): int
    {
        $stmt = $this->db->prepare('SELECT id FROM classes WHERE name = ?');
        $stmt->execute([$name]);

        return (int) $stmt->fetchColumn();
    }

    private function classIdsOf(int $teacherId): array
    {
        return listTeachers($this->db, $teacherId)[0]['class_ids'];
    }

    public function testUpdateTeacherChangesNameAndUsername(): void
    {
        $id = $this->seededTeacherId();

        updateTeacher($this->db, $id, ['display_name' => 'Új Név', 'username' => 'uj-nev'], null);

        $teacher = listTeachers($this->db, $id)[0];
        $this->assertSame('Új Név', $teacher['display_name']);
        $this->assertSame('uj-nev', $teacher['username']);
    }

    public function testUpdateTeacherHashesNewPassword(): void
    {
        $id = $this->seededTeacherId();

        updateTeacher($this->db, $id, ['password' => 'uj-jelszo'], null);

        $hash = $this->db->query("SELECT password_hash FROM users WHERE id = $id")->fetchColumn();
        $this->assertNotSame('uj-jelszo', $hash);
        $this->assertTrue(password_verify('uj-jelszo', $hash));
    }

    public function testUpdateTeacherKeepsOtherFieldsUntouched(): void
    {
        $id = $this->seededTeacherId();

        updateTeacher($this->db, $id, ['display_name' => 'Új Név'], null);

        $this->assertSame('tanar', listTeachers($this->db, $id)[0]['username']);
        $this->assertCount(2, $this->classIdsOf($id));
    }

    public function testClassIdsReplaceTheWholeAssignmentList(): void
    {
        $id = $this->seededTeacherId();
        $newClass = createClass($this->db, '11.C', null);
        $kept = $this->classId('9.A');

        updateTeacher($this->db, $id, [], [$kept, $newClass['id']]);

        $expected = [$kept, $newClass['id']];
        sort($expected);
        $this->assertSame($expected, $this->classIdsOf($id));
    }

    public function testEmptyClassIdsRemoveEveryAssignmentButKeepTheClasses(): void
    {
        $id = $this->seededTeacherId();

        updateTeacher($this->db, $id, [], []);

        $this->assertSame([], $this->classIdsOf($id));
        $this->assertCount(2, listClasses($this->db));
    }

    public function testNullClassIdsLeaveAssignmentsUnchanged(): void
    {
        $id = $this->seededTeacherId();

        updateTeacher($this->db, $id, ['display_name' => 'Új Név'], null);

        $this->assertCount(2, $this->classIdsOf($id));
    }

    public function testDuplicateClassIdsAreStoredOnce(): void
    {
        $id = $this->seededTeacherId();
        $classId = $this->classId('9.A');

        updateTeacher($this->db, $id, [], [$classId, $classId]);

        $this->assertSame([$classId], $this->classIdsOf($id));
    }

    public function testAssigningAClassToASecondTeacherKeepsTheFirst(): void
    {
        $first = $this->seededTeacherId();
        $second = createTeacher($this->db, 'masodik', 'titok123', 'Bakos Tamás')['id'];
        $classId = $this->classId('9.A');

        updateTeacher($this->db, $second, [], [$classId]);

        $this->assertContains($classId, $this->classIdsOf($first));
        $this->assertSame([$classId], $this->classIdsOf($second));
    }

    public function testFailedUpdateRollsBackEverything(): void
    {
        $id = $this->seededTeacherId();

        try {
            updateTeacher($this->db, $id, ['display_name' => 'Nem marad meg'], [999]);
            $this->fail('A nem létező osztály kivételt kell dobjon');
        } catch (PDOException) {
            $this->assertFalse($this->db->inTransaction());
            $this->assertSame('Kovács Anna', listTeachers($this->db, $id)[0]['display_name']);
            $this->assertCount(2, $this->classIdsOf($id));
        }
    }

    public function testUsernameTakenIgnoresTheTeachersOwnName(): void
    {
        $id = $this->seededTeacherId();

        $this->assertFalse(usernameTaken($this->db, 'tanar', $id));
        $this->assertTrue(usernameTaken($this->db, 'admin', $id));
        $this->assertTrue(usernameTaken($this->db, 'tanar'));
    }

    public function testIsIntListAcceptsOnlyListsOfIntegers(): void
    {
        $this->assertTrue(isIntList([]));
        $this->assertTrue(isIntList([1, 3]));
        $this->assertFalse(isIntList([1, '3']));
        $this->assertFalse(isIntList(['a' => 1]));
        $this->assertFalse(isIntList(1));
        $this->assertFalse(isIntList(null));
    }

    public function testDeleteTeacherRemovesOnlyTheTeacherAndTheirLinks(): void
    {
        $id = $this->seededTeacherId();

        deleteTeacher($this->db, $id);

        $this->assertFalse(teacherExists($this->db, $id));
        $this->assertCount(2, listClasses($this->db));
        $this->assertSame([], listClasses($this->db)[0]['teachers']);
    }

    public function testDeleteTeacherDoesNotDeleteAnAdmin(): void
    {
        $adminId = (int) $this->db->query("SELECT id FROM users WHERE username = 'admin'")->fetchColumn();

        deleteTeacher($this->db, $adminId);

        $this->assertTrue(usernameTaken($this->db, 'admin'));
    }

    public function testRenameClass(): void
    {
        $id = $this->classId('9.A');

        renameClass($this->db, $id, '9.Z');

        $this->assertSame('9.Z', listClasses($this->db, $id)[0]['name']);
    }

    public function testClassNameTakenIgnoresTheClassItself(): void
    {
        $id = $this->classId('9.A');

        $this->assertFalse(classNameTaken($this->db, '9.A', $id));
        $this->assertTrue(classNameTaken($this->db, '10.B', $id));
    }

    public function testListClassesCanBeLimitedToOneClass(): void
    {
        $id = $this->classId('9.A');

        $this->assertSame([$id], array_column(listClasses($this->db, $id), 'id'));
        $this->assertSame([], listClasses($this->db, 999));
    }

    public function testDeleteClassRemovesStudentsAndHistoryButNotTheTeacher(): void
    {
        $id = $this->classId('9.A');
        $studentId = listStudents($this->db, $id)[0]['id'];
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-10-05')");

        deleteClass($this->db, $id);

        $this->assertFalse(classExists($this->db, $id));
        $this->assertSame([], listStudents($this->db, $id));
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM draw_history')->fetchColumn());
        $this->assertTrue(teacherExists($this->db, $this->seededTeacherId()));
        $this->assertCount(1, $this->classIdsOf($this->seededTeacherId()));
    }

    public function testListStudentsReturnsTheClassStudentsByName(): void
    {
        $students = listStudents($this->db, $this->classId('9.A'));

        $names = array_column($students, 'name');
        $this->assertSame(['Horváth Lilla', 'Nagy Péter', 'Szabó Eszter', 'Tóth Bence'], $names);
        $this->assertSame(['id', 'class_id', 'name', 'weight', 'created_at'], array_keys($students[0]));
        $this->assertIsInt($students[0]['id']);
        $this->assertIsInt($students[0]['weight']);
    }

    public function testListStudentsIsEmptyForClassWithoutStudents(): void
    {
        $class = createClass($this->db, '11.C', null);

        $this->assertSame([], listStudents($this->db, $class['id']));
    }

    public function testUpdateStudentChangesNameWeightAndClass(): void
    {
        $studentId = listStudents($this->db, $this->classId('9.A'))[0]['id'];
        $otherClass = $this->classId('10.B');

        $changes = ['name' => 'Új Diák', 'weight' => 3, 'class_id' => $otherClass];
        $student = updateStudent($this->db, $studentId, $changes);

        $this->assertSame('Új Diák', $student['name']);
        $this->assertSame(3, $student['weight']);
        $this->assertSame($otherClass, $student['class_id']);
        $this->assertSame($studentId, $student['id']);
    }

    public function testUpdateStudentKeepsOtherFieldsUntouched(): void
    {
        $student = listStudents($this->db, $this->classId('9.A'))[0];

        $updated = updateStudent($this->db, $student['id'], ['weight' => 5]);

        $this->assertSame($student['name'], $updated['name']);
        $this->assertSame($student['class_id'], $updated['class_id']);
        $this->assertSame(5, $updated['weight']);
    }

    public function testUpdateStudentWeightCannotGoBelowOne(): void
    {
        $studentId = listStudents($this->db, $this->classId('9.A'))[0]['id'];

        $this->expectException(PDOException::class);
        updateStudent($this->db, $studentId, ['weight' => 0]);
    }

    public function testStudentExists(): void
    {
        $studentId = listStudents($this->db, $this->classId('9.A'))[0]['id'];

        $this->assertTrue(studentExists($this->db, $studentId));
        $this->assertFalse(studentExists($this->db, 999));
    }

    public function testDeleteStudentRemovesHistoryButNotTheClassmates(): void
    {
        $classId = $this->classId('9.A');
        $studentId = listStudents($this->db, $classId)[0]['id'];
        $this->db->exec("INSERT INTO draw_history (student_id, drawn_on) VALUES ($studentId, '2026-10-05')");

        deleteStudent($this->db, $studentId);

        $this->assertFalse(studentExists($this->db, $studentId));
        $this->assertCount(3, listStudents($this->db, $classId));
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM draw_history')->fetchColumn());
    }
}
