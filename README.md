# AFPL_beadando

## Backend API

Ebben a dokumentumban láthatók a backend végpontjai által kért adatok, valamint a visszaadott státuszkódok és JSON válaszok. Hiba esetén a válasz törzse mindig `{ "error": "..." }` formátumú.

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
