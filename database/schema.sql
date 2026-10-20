-- Diáksorsoló - SQLite adatbázis-séma
-- A migráció (migrate.php) ezt a fájlt futtatja le.

-- SQLite-ban a foreign key ellenőrzés kapcsolatonként kapcsolható be.
PRAGMA foreign_keys = ON;

-- Felhasználók: adminisztrátorok és tanárok
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    display_name  TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('admin', 'teacher')),
    created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Osztályok (csoportok), egy tanárhoz rendelve
CREATE TABLE IF NOT EXISTS classes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    teacher_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Diákok; a weight a féléves valószínűségi mutató (alapértelmezett 10, minimum 1)
CREATE TABLE IF NOT EXISTS students (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id   INTEGER NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    weight     INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 1),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Kihúzási előzmények: melyik diákot melyik napon húzták ki.
-- A UNIQUE megkötés adatbázis szinten is biztosítja a napi 1x kihúzhatóságot.
CREATE TABLE IF NOT EXISTS draw_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
    drawn_on   TEXT    NOT NULL DEFAULT (date('now', 'localtime')),
    UNIQUE (student_id, drawn_on)
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_draw_history_drawn_on ON draw_history (drawn_on);
