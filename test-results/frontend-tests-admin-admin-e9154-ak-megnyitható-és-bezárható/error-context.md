# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend\tests\admin\admin.spec.cjs >> A tanárfelvételi ablak megnyitható és bezárható
- Location: frontend\tests\admin\admin.spec.cjs:195:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/admin.html", waiting until "load"

```

# Test source

```ts
  6   |     "me.php": {
  7   |         user: {
  8   |             id: 1,
  9   |             username: "teszt_admin",
  10  |             display_name: "Teszt Admin",
  11  |             role: "admin"
  12  |         }
  13  |     },
  14  | 
  15  |     "admin/teachers.php": {
  16  |         teachers: [
  17  |             {
  18  |                 id: 2,
  19  |                 username: "teszt_anna",
  20  |                 display_name: "Teszt Anna",
  21  |                 role: "teacher",
  22  |                 created_at: "2026-10-24"
  23  |             },
  24  |             {
  25  |                 id: 3,
  26  |                 username: "teszt_bela",
  27  |                 display_name: "Teszt Béla",
  28  |                 role: "teacher",
  29  |                 created_at: "2026-10-25"
  30  |             }
  31  |         ]
  32  |     },
  33  | 
  34  |     "admin/classes.php": {
  35  |         classes: [
  36  |             {
  37  |                 id: 1,
  38  |                 name: "9.A",
  39  |                 teacher_id: 2,
  40  |                 teacher_name: "Teszt Anna",
  41  |                 created_at: "2026-10-24"
  42  |             },
  43  |             {
  44  |                 id: 2,
  45  |                 name: "10.B",
  46  |                 teacher_id: 3,
  47  |                 teacher_name: "Teszt Béla",
  48  |                 created_at: "2026-10-25"
  49  |             },
  50  |             {
  51  |                 id: 3,
  52  |                 name: "11.C",
  53  |                 teacher_id: null,
  54  |                 teacher_name: null,
  55  |                 created_at: "2026-10-26"
  56  |             }
  57  |         ]
  58  |     }
  59  | };
  60  | 
  61  | let javascriptHibak;
  62  | let nemVartKeresek;
  63  | 
  64  | 
  65  | // Minden teszt előtt előkészítjük a környezetet.
  66  | test.beforeEach(async ({ page }) => {
  67  |     javascriptHibak = [];
  68  |     nemVartKeresek = [];
  69  | 
  70  |     // A böngészőben keletkező JavaScript-hibák gyűjtése.
  71  |     page.on("pageerror", error => {
  72  |         javascriptHibak.push(error.message);
  73  |     });
  74  | 
  75  |     // Elfogjuk a backendnek szánt kéréseket.
  76  |     await page.route("**/backend/public/**", async route => {
  77  |         const keres = route.request();
  78  |         const url = new URL(keres.url());
  79  |         const vegpont = url.pathname.split("/backend/public/")[1];
  80  | 
  81  |         if (
  82  |             keres.method() === "GET" &&
  83  |             Object.hasOwn(tesztValaszok, vegpont)
  84  |         ) {
  85  |             await route.fulfill({
  86  |                 status: 200,
  87  |                 json: tesztValaszok[vegpont]
  88  |             });
  89  | 
  90  |             return;
  91  |         }
  92  | 
  93  |         // Ezek a tesztek nem küldhetnek mentési kérést.
  94  |         nemVartKeresek.push(
  95  |             `${keres.method()} ${url.pathname}`
  96  |         );
  97  | 
  98  |         await route.fulfill({
  99  |             status: 501,
  100 |             json: {
  101 |                 error: "Ehhez a kéréshez nincs tesztválasz."
  102 |             }
  103 |         });
  104 |     });
  105 | 
> 106 |     await page.goto("/admin.html");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  107 | });
  108 | 
  109 | 
  110 | // Minden teszt végén ellenőrizzük az összegyűjtött hibákat.
  111 | test.afterEach(async () => {
  112 |     expect(
  113 |         javascriptHibak,
  114 |         "JavaScript-hiba történt az oldalon."
  115 |     ).toEqual([]);
  116 | 
  117 |     expect(
  118 |         nemVartKeresek,
  119 |         "Nem várt backendkérés történt."
  120 |     ).toEqual([]);
  121 | });
  122 | 
  123 | 
  124 | // Közös művelet: a Tanárok menüpont megnyitása.
  125 | async function tanarListaMegnyitasa(page) {
  126 |     const gomb = page.locator(
  127 |         'button[data-nezet="tanarok"]'
  128 |     );
  129 | 
  130 |     await expect(gomb).toBeEnabled();
  131 |     await gomb.click();
  132 | 
  133 |     await expect(
  134 |         page.locator("#admin-tartalom").getByRole(
  135 |             "heading",
  136 |             { name: "Tanárok", exact: true }
  137 |         )
  138 |     ).toBeVisible();
  139 | }
  140 | 
  141 | 
  142 | // 1. Dashboard ellenőrzése.
  143 | test("A dashboard a megfelelő darabszámokat mutatja", async ({ page }) => {
  144 |     await expect(
  145 |         page.locator("#admin-tartalom").getByRole(
  146 |             "heading",
  147 |             { name: "Admin Dashboard", exact: true }
  148 |         )
  149 |     ).toBeVisible();
  150 | 
  151 |     await expect(
  152 |         page.locator("#tanarok-szama")
  153 |     ).toHaveText("2");
  154 | 
  155 |     await expect(
  156 |         page.locator("#osztalyok-szama")
  157 |     ).toHaveText("3");
  158 | });
  159 | 
  160 | 
  161 | // 2. Tanártáblázat ellenőrzése.
  162 | test("A Tanárok menü megjeleníti a tanárlistát", async ({ page }) => {
  163 |     await tanarListaMegnyitasa(page);
  164 | 
  165 |     const sorok = page.locator(
  166 |         "#admin-tartalom table tbody tr"
  167 |     );
  168 | 
  169 |     await expect(sorok).toHaveCount(2);
  170 | 
  171 |     const annaSora = sorok.filter({
  172 |         hasText: "teszt_anna"
  173 |     });
  174 | 
  175 |     await expect(annaSora).toHaveCount(1);
  176 |     await expect(annaSora.locator("td").nth(1)).toHaveText("Teszt Anna");
  177 |     await expect(annaSora.locator("td").nth(2)).toHaveText("2026-10-24");
  178 | 
  179 |     const belaSora = sorok.filter({
  180 |         hasText: "teszt_bela"
  181 |     });
  182 | 
  183 |     await expect(belaSora).toHaveCount(1);
  184 |     await expect(belaSora.locator("td").nth(1)).toHaveText("Teszt Béla");
  185 | 
  186 |     await expect(
  187 |         page.locator(
  188 |             '#admin-tartalom button[data-muvelet="tanar-hozzaadas"]'
  189 |         )
  190 |     ).toBeVisible();
  191 | });
  192 | 
  193 | 
  194 | // 3. Tanárfelvételi ablak ellenőrzése.
  195 | test("A tanárfelvételi ablak megnyitható és bezárható", async ({ page }) => {
  196 |     await tanarListaMegnyitasa(page);
  197 | 
  198 |     const hozzaadasGomb = page.locator(
  199 |         '#admin-tartalom button[data-muvelet="tanar-hozzaadas"]'
  200 |     );
  201 | 
  202 |     const ablak = page.locator("#tanar-dialog");
  203 | 
  204 |     await expect(ablak).not.toBeVisible();
  205 | 
  206 |     // Megnyitjuk az ablakot.
```