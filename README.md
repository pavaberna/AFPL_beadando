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
  - `200` – `{ "teachers": [{ "id", "username", "display_name", "role", "created_at", "class_ids": [1, 3] }] }` (az összes tanár, névsorban; a `class_ids` a tanárhoz rendelt osztályok azonosítói, üres lista, ha nincs osztálya)
- `GET admin/classes.php`
  - `200` – `{ "classes": [{ "id", "name", "teacher_id", "teacher_name", "created_at", "teachers": [{ "id", "display_name" }] }] }` (az összes osztály, névsorban; a `teachers` az osztály összes tanára névsorban, üres lista, ha nincs tanára)
  - Egy osztályhoz több tanár is tartozhat. A `teacher_id` és a `teacher_name` átmenetileg megmarad a régi felület miatt: a legkorábban felvett hozzárendelt tanár adatai, `null`, ha nincs tanára. Új kódban a `teachers` listát kell használni.
- `GET admin/students.php?class_id=1`
  - `200` – `{ "students": [{ "id", "class_id", "name", "weight", "created_at" }] }` (az osztály diákjai, névsorban)
  - `400` – a `class_id` hiányzik vagy nem egész szám
  - `404` – a megadott osztály nem létezik

Felvétel (`POST`):

- `POST admin/teachers.php` (kérés: `username`, `password`, `display_name`)
  - `201` – `{ "teacher": { "id", "username", "display_name", "role", "created_at" } }`
  - `400` – hiányzó adat
  - `409` – a felhasználónév már foglalt
- `POST admin/classes.php` (kérés: `name`, `teacher_id` – nem kötelező; megadva az osztály a tanárhoz lesz rendelve)
  - `201` – `{ "class": { "id", "name", "teacher_id", "created_at" } }`
  - `400` – hiányzó név, vagy a `teacher_id` nem egész szám
  - `404` – a megadott tanár nem létezik
  - `409` – az osztálynév már foglalt
- `POST admin/students.php` (kérés: `name`, `class_id`)
  - `201` – `{ "student": { "id", "class_id", "name", "weight", "created_at" } }`
  - `400` – hiányzó név, vagy a `class_id` nem egész szám
  - `404` – a megadott osztály nem létezik
- `POST admin/students-import.php` (`multipart/form-data` kérés: `class_id`, `file`)
  - `201` – `{ "imported": [{ "id", "class_id", "name", "weight", "created_at" }], "skipped": ["..."] }`
  - `200` – ugyanez a válasz, ha minden név kimaradt, így nem jött létre új diák
  - `400` – hiányzó fájl, hibás `class_id` vagy hibás CSV (a hibaüzenet megnevezi a hibás sort)
  - `404` – a megadott osztály nem létezik

A CSV fájl UTF-8 kódolású, az elválasztó `;` vagy `,`. Az első sor a fejléc, ebben kell lennie egy `nev`, `név` vagy `name` oszlopnak, a többi oszlop kimarad:

```csv
nev
Kiss Anna
Tóth Béla
```

Hibás fájlnál egyetlen diák sem kerül be. Az osztályban már szereplő vagy a fájlban ismétlődő nevek a `skipped` listába kerülnek, ezért ugyanaz a fájl többször is feltölthető. Egy új diákot, akinek a neve megegyezik egy osztálytársáéval, az `admin/students.php` végponton kell felvenni.

Módosítás (`PATCH`, a kérés törzse JSON, az `id` kötelező, a többi mező közül legalább egyet meg kell adni):

- `PATCH admin/teachers.php` (kérés: `id`, `display_name`, `username`, `password`, `class_ids` – mind nem kötelező)
  - `200` – `{ "teacher": { "id", "username", "display_name", "role", "created_at", "class_ids" } }`
  - `400` – hibás `id`, üres név, felhasználónév vagy jelszó, a `class_ids` nem egész számokból álló lista, vagy nincs módosítandó mező
  - `404` – a megadott tanár vagy a `class_ids` egyik osztálya nem létezik
  - `409` – a felhasználónév már foglalt
  - A `class_ids` a tanárhoz rendelt osztályok **teljes új listája**: ami nincs benne, annak a hozzárendelése megszűnik (az osztály megmarad), az üres lista mindet leveszi. Más tanárok hozzárendelését nem érinti.
- `PATCH admin/classes.php` (kérés: `id`, `name`)
  - `200` – `{ "class": { "id", "name", "teacher_id", "teacher_name", "created_at", "teachers" } }`
  - `400` – hibás `id` vagy hiányzó név
  - `404` – az osztály nem létezik
  - `409` – az osztálynév már foglalt
- `PATCH admin/students.php` (kérés: `id`, `name`, `weight`, `class_id` – mind nem kötelező)
  - `200` – `{ "student": { "id", "class_id", "name", "weight", "created_at" } }`
  - `400` – hibás `id`, üres név, a `weight` nem legalább 1 egész szám, a `class_id` nem egész szám, vagy nincs módosítandó mező
  - `404` – a diák vagy a megadott osztály nem létezik

Törlés (`DELETE`, a kérés törzse JSON: `{ "id": 1 }`):

- `DELETE admin/teachers.php` – a tanár törlődik, a hozzárendelései megszűnnek, az osztályai megmaradnak
- `DELETE admin/classes.php` – az osztály, a diákjai és azok kihúzási előzményei törlődnek, a tanárok megmaradnak
- `DELETE admin/students.php` – a diák és a kihúzási előzményei törlődnek
  - Mindháromnál `200` – `{ "ok": true }`, `400` – hibás `id`, `404` – nem létezik

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

## Adatbázis biztonsági mentés

A `backend` mappából futtatva időbélyeggel ellátott másolat készül az adatbázisról:

```sh
php database/backup.php [adatbázis fájl útvonala] [mentési mappa]
```

Paraméterek nélkül a `database/database.sqlite` fájlt menti a `database/backups` mappába, például `database_2026-11-03_02-00-00.sqlite` néven. Sikeres mentésnél a kimenet `Backup finished: <útvonal>`, hibánál `Backup failed: <hiba>`, és a kilépési kód `1`. Hiányzó adatbázisnál nem jön létre üres mentés.

A szkript futásonként egy mentést készít, a napi futtatást ütemezővel kell beállítani (az útvonalat a saját telepítésre kell cserélni):

- Linux (`crontab -e`, minden nap 2:00-kor): `0 2 * * * cd /eleresi/ut/backend && php database/backup.php`
- Windows: `schtasks /Create /SC DAILY /ST 02:00 /TN "AFPL backup" /TR "php C:\eleresi\ut\backend\database\backup.php"`

A régi mentések nem törlődnek automatikusan. A mentések jelszóhasheket is tartalmaznak, ezért nem kerülhetnek nyilvánosan elérhető helyre. A `.gitignore` miatt a repóba sem kerülnek be.

Visszaállítás: amíg az alkalmazás nem kap kéréseket, a kiválasztott mentést kell a `database/database.sqlite` helyére másolni.
