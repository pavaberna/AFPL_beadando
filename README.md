# AFPL_beadando

## Backend API

Ebben a dokumentumban láthatók a backend végpontjai által kért adatok, valamint a visszaadott státuszkódok és JSON válaszok. Hiba esetén a válasz törzse mindig `{ "error": "..." }` formátumú.

### Auth API

- `POST login.php` (kérés: `username`, `password`)
  - `200` – `{ "user": { "id", "username", "display_name", "role" } }`
  - `400` – hiányzik a felhasználónév vagy a jelszó
  - `401` – hibás felhasználónév/jelszó
- `POST logout.php`
  - `200` – `{ "ok": true }`
- `GET me.php`
  - `200` – `{ "user": { "id", "username", "display_name", "role" } }`
  - `401` – nincs bejelentkezve

Mindhárom `405`-öt ad, ha rossz a HTTP metódus.

### Admin API

Csak bejelentkezett admin használhatja. Közös hibák: `401` (nincs bejelentkezve), `403` (nem admin), `405` (rossz metódus).

- `GET admin/teachers.php`
  - `200` – `{ "teachers": [{ "id", "username", "display_name", "role", "created_at" }] }` (az összes tanár, névsorban)
- `GET admin/classes.php`
  - `200` – `{ "classes": [{ "id", "name", "teacher_id", "teacher_name", "created_at" }] }` (az összes osztály, névsorban; a `teacher_id` és a `teacher_name` `null`, ha nincs tanára)

Felvétel (`POST`):

- `POST admin/teachers.php` (kérés: `username`, `password`, `display_name`)
  - `201` – `{ "teacher": { "id", "username", "display_name", "role", "created_at" } }`
  - `400` – hiányzó adat
  - `409` – a felhasználónév már foglalt
- `POST admin/classes.php` (kérés: `name`, `teacher_id` – nem kötelező)
  - `201` – `{ "class": { "id", "name", "teacher_id", "created_at" } }`
  - `400` – hiányzó név, vagy a `teacher_id` nem egész szám
  - `404` – a megadott tanár nem létezik
  - `409` – az osztálynév már foglalt
- `POST admin/students.php` (kérés: `name`, `class_id`)
  - `201` – `{ "student": { "id", "class_id", "name", "weight", "created_at" } }`
  - `400` – hiányzó név, vagy a `class_id` nem egész szám
  - `404` – a megadott osztály nem létezik

### Teacher API

`GET teacher/classes.php` – csak bejelentkezett tanár használhatja.

- `GET teacher/classes.php`
  - `200` – `{ "classes": [{ "id", "name", "created_at" }] }` (a tanárhoz rendelt osztályok, névsorban)
- `GET teacher/classes.php?class_id=1` (a `class_id` egész szám)
  - `200` – `{ "classes": [...], "students": [{ "id", "name", "weight", "last_drawn_on" }] }`, a `last_drawn_on` `null`, ha a diákot még nem húzták ki
  - `400` – a `class_id` nem egész szám
  - `403` – az osztály másik tanárhoz tartozik
  - `404` – a megadott osztály nem létezik

Közös hibák: `401` (nincs bejelentkezve), `403` (be van lépve, de nem tanár), `405` (rossz metódus).
