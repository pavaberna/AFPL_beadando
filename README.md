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
  - `200` – `{ "classes": [{ "id", "name", "teacher_id", "teacher_name", "created_at", "teachers": [{ "id", "display_name" }] }] }` (az összes osztály, névsorban; a `teachers` az osztály összes tanára névsorban, üres lista, ha nincs tanára)
  - Egy osztályhoz több tanár is tartozhat. A `teacher_id` és a `teacher_name` átmenetileg megmarad a régi felület miatt: a legkorábban felvett hozzárendelt tanár adatai, `null`, ha nincs tanára. Új kódban a `teachers` listát kell használni.

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

### Teacher API

A `teacher/classes.php`-t és a `teacher/draw.php`-t csak bejelentkezett tanár használhatja.

- `GET teacher/classes.php`
  - `200` – `{ "classes": [{ "id", "name", "created_at" }] }` (a tanárhoz rendelt osztályok, névsorban)
- `GET teacher/classes.php?class_id=1` (a `class_id` egész szám)
  - `200` – `{ "classes": [...], "students": [{ "id", "name", "weight", "last_drawn_on", "drawn_today" }] }`, a `last_drawn_on` `null`, ha a diákot még nem húzták ki; a `drawn_today` `true`, ha ma már kihúzták (ma már nem sorsolható)
  - `400` – a `class_id` nem egész szám
  - `403` – az osztály másik tanárhoz tartozik
  - `404` – a megadott osztály nem létezik
- `POST teacher/draw.php` (kérés: `class_id`, `count` – hány diákot sorsoljon, `absent_ids` – a hiányzó diákok azonosítói, nem kötelező)
  - `201` – `{ "drawn_on": "2026-11-03", "students": [{ "id", "name", "weight" }] }` (a kisorsolt diákok a kihúzás sorrendjében, a `weight` már a csökkentett súly)
  - `200` – ugyanez a válasz üres `students` listával, ha ma senki sem sorsolható
  - `400` – a `class_id` nem egész szám, a `count` nem legalább 1 egész szám, vagy az `absent_ids` nem egész számokból álló lista
  - `403` – az osztály nincs a tanárhoz rendelve
  - `404` – a megadott osztály nem létezik
  - `409` – közben egy másik sorsolás is futott ugyanabban az osztályban (például dupla kattintás), újra kell próbálni

A sorsolás a hiányzókat és a ma már kihúzott diákokat kihagyja, a többiek közül a súlyukkal arányos eséllyel húz, egy diákot legfeljebb egyszer. Ha a `count` több, mint ahány diák ma sorsolható, annyit húz, ahányan vannak, ezért a `students` lista hossza adja a pörgetések számát. A kihúzott diákok súlya 1-gyel csökken (de 1 alá nem megy), és a mai dátum bekerül a kihúzási előzmények közé. A "mai nap" magyar idő (`Europe/Budapest`) szerint számít, a szerver beállításától függetlenül, és éjfél után a tegnap kihúzottak újra sorsolhatók. Vagy minden kihúzás rögzül, vagy egyik sem. A más osztályba tartozó `absent_ids` elemek nem számítanak.

Közös hibák: `401` (nincs bejelentkezve), `403` (be van lépve, de nem tanár), `405` (rossz metódus).
