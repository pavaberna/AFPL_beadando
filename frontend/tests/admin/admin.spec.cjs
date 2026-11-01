const { test, expect } = require("@playwright/test");


// A backend helyett ezeket a válaszokat kapja az oldal.
const tesztValaszok = {
    "me.php": {
        user: {
            id: 1,
            username: "teszt_admin",
            display_name: "Teszt Admin",
            role: "admin"
        }
    },

    "admin/teachers.php": {
        teachers: [
            {
                id: 2,
                username: "teszt_anna",
                display_name: "Teszt Anna",
                role: "teacher",
                created_at: "2026-10-24"
            },
            {
                id: 3,
                username: "teszt_bela",
                display_name: "Teszt Béla",
                role: "teacher",
                created_at: "2026-10-25"
            }
        ]
    },

    "admin/classes.php": {
        classes: [
            {
                id: 1,
                name: "9.A",
                teacher_id: 2,
                teacher_name: "Teszt Anna",
                created_at: "2026-10-24"
            },
            {
                id: 2,
                name: "10.B",
                teacher_id: 3,
                teacher_name: "Teszt Béla",
                created_at: "2026-10-25"
            },
            {
                id: 3,
                name: "11.C",
                teacher_id: null,
                teacher_name: null,
                created_at: "2026-10-26"
            }
        ]
    }
};

let javascriptHibak;
let nemVartKeresek;


// Minden teszt előtt előkészítjük a környezetet.
test.beforeEach(async ({ page }) => {
    javascriptHibak = [];
    nemVartKeresek = [];

    // A böngészőben keletkező JavaScript-hibák gyűjtése.
    page.on("pageerror", error => {
        javascriptHibak.push(error.message);
    });

    // Elfogjuk a backendnek szánt kéréseket.
    await page.route("**/backend/public/**", async route => {
        const keres = route.request();
        const url = new URL(keres.url());
        const vegpont = url.pathname.split("/backend/public/")[1];

        if (
            keres.method() === "GET" &&
            Object.hasOwn(tesztValaszok, vegpont)
        ) {
            await route.fulfill({
                status: 200,
                json: tesztValaszok[vegpont]
            });

            return;
        }

        // Ezek a tesztek nem küldhetnek mentési kérést.
        nemVartKeresek.push(
            `${keres.method()} ${url.pathname}`
        );

        await route.fulfill({
            status: 501,
            json: {
                error: "Ehhez a kéréshez nincs tesztválasz."
            }
        });
    });

    await page.goto("/admin.html");
});


// Minden teszt végén ellenőrizzük az összegyűjtött hibákat.
test.afterEach(async () => {
    expect(
        javascriptHibak,
        "JavaScript-hiba történt az oldalon."
    ).toEqual([]);

    expect(
        nemVartKeresek,
        "Nem várt backendkérés történt."
    ).toEqual([]);
});


// Közös művelet: a Tanárok menüpont megnyitása.
async function tanarListaMegnyitasa(page) {
    const gomb = page.locator(
        'button[data-nezet="tanarok"]'
    );

    await expect(gomb).toBeEnabled();
    await gomb.click();

    await expect(
        page.locator("#admin-tartalom").getByRole(
            "heading",
            { name: "Tanárok", exact: true }
        )
    ).toBeVisible();
}


// 1. Dashboard ellenőrzése.
test("A dashboard a megfelelő darabszámokat mutatja", async ({ page }) => {
    await expect(
        page.locator("#admin-tartalom").getByRole(
            "heading",
            { name: "Admin Dashboard", exact: true }
        )
    ).toBeVisible();

    await expect(
        page.locator("#tanarok-szama")
    ).toHaveText("2");

    await expect(
        page.locator("#osztalyok-szama")
    ).toHaveText("3");
});


// 2. Tanártáblázat ellenőrzése.
test("A Tanárok menü megjeleníti a tanárlistát", async ({ page }) => {
    await tanarListaMegnyitasa(page);

    const sorok = page.locator(
        "#admin-tartalom table tbody tr"
    );

    await expect(sorok).toHaveCount(2);

    const annaSora = sorok.filter({
        hasText: "teszt_anna"
    });

    await expect(annaSora).toHaveCount(1);
    await expect(annaSora.locator("td").nth(1)).toHaveText("Teszt Anna");
    await expect(annaSora.locator("td").nth(2)).toHaveText("2026-10-24");

    const belaSora = sorok.filter({
        hasText: "teszt_bela"
    });

    await expect(belaSora).toHaveCount(1);
    await expect(belaSora.locator("td").nth(1)).toHaveText("Teszt Béla");

    await expect(
        page.locator(
            '#admin-tartalom button[data-muvelet="tanar-hozzaadas"]'
        )
    ).toBeVisible();
});


// 3. Tanárfelvételi ablak ellenőrzése.
test("A tanárfelvételi ablak megnyitható és bezárható", async ({ page }) => {
    await tanarListaMegnyitasa(page);

    const hozzaadasGomb = page.locator(
        '#admin-tartalom button[data-muvelet="tanar-hozzaadas"]'
    );

    const ablak = page.locator("#tanar-dialog");

    await expect(ablak).not.toBeVisible();

    // Megnyitjuk az ablakot.
    await hozzaadasGomb.click();
    await expect(ablak).toBeVisible();

    // Kitöltjük a mezőket, de nem mentünk.
    await page.locator("#tanar-username").fill("ideiglenes_tanar");
    await page.locator("#tanar-display-name").fill("Ideiglenes Tanár");
    await page.locator("#tanar-password").fill("Teszt-jelszo-123!");

    // Bezárjuk a Mégse gombbal.
    await page.locator("#tanar-megse").click();
    await expect(ablak).not.toBeVisible();

    // Újbóli megnyitáskor üres mezőket várunk.
    await hozzaadasGomb.click();
    await expect(ablak).toBeVisible();

    await expect(
        page.locator("#tanar-username")
    ).toHaveValue("");

    await expect(
        page.locator("#tanar-display-name")
    ).toHaveValue("");

    await expect(
        page.locator("#tanar-password")
    ).toHaveValue("");

    // Az Escape billentyűvel is bezárható.
    await page.keyboard.press("Escape");
    await expect(ablak).not.toBeVisible();
});