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

async function beallitasokMegnyitasa(page) {
    await page.getByText("Teszt Admin", { exact: true }).click();
    await page.getByRole("button", { name: "Beállítások" }).click();
    return page.getByRole("dialog", { name: "Beállítások" });
}

test("Az admin témaválasztása újratöltés után is érvényes", async ({ page }) => {
    const ablak = await beallitasokMegnyitasa(page);
    await ablak.getByLabel("Megjelenés").selectOption("colorful");
    await ablak.getByRole("button", { name: "Megjelenés mentése" }).click();
    await page.reload();
    await beallitasokMegnyitasa(page);
    await expect(ablak.getByLabel("Megjelenés")).toHaveValue("colorful");
    await expect(page.locator('link[href$="tema-szines.css"]')).toHaveAttribute("media", "all");
});

test("Félévváltáskor csak megerősítésre indul a POST, és látszik a létszám", async ({ page }) => {
    const ablak = await beallitasokMegnyitasa(page);
    const inditas = ablak.getByRole("button", { name: "Súlyok visszaállítása…" });
    const kerdes = page.getByRole("dialog", { name: "Félévváltás" });
    await inditas.click();
    await kerdes.getByRole("button", { name: "Mégse" }).click();
    await expect(kerdes).toBeHidden();

    const keresek = [];
    await page.route("**/admin/reset-weights.php", route => {
        keresek.push([route.request().method(), route.request().postData()]);
        return route.fulfill({ json: { ok: true, reset_count: 8 } });
    });
    await inditas.click();
    await kerdes.getByRole("button", { name: "Visszaállítás", exact: true }).click();
    await expect(ablak.getByRole("status")).toContainText("Érintett diákok száma: 8.");
    expect(keresek).toEqual([["POST", null]]);
});

test("Sikertelen félévváltás után az admin látja a hibát és bezárhatja az ablakot", async ({ page }) => {
    await page.route("**/admin/reset-weights.php", route => route.fulfill({
        status: 403, json: { error: "Admin jogosultság szükséges." }
    }));
    const ablak = await beallitasokMegnyitasa(page);
    await ablak.getByRole("button", { name: "Súlyok visszaállítása…" }).click();
    const kerdes = page.getByRole("dialog", { name: "Félévváltás" });
    await kerdes.getByRole("button", { name: "Visszaállítás", exact: true }).click();
    await expect(kerdes.getByRole("alert")).toHaveText("Admin jogosultság szükséges.");
    await kerdes.getByRole("button", { name: "Mégse" }).click();
    await expect(ablak.getByRole("status")).toBeEmpty();
});

test("Az admin a neve alatti menüből jelentkezhet ki", async ({ page }) => {
    const kilepes = page.getByRole("button", { name: "Kijelentkezés" });
    await expect(kilepes).toBeHidden();
    await page.getByText("Teszt Admin", { exact: true }).click();
    await page.route("**/backend/public/logout.php", route => {
        expect(route.request().method()).toBe("POST");
        return route.fulfill({ json: { ok: true } });
    });
    await kilepes.click();
    await expect(page).toHaveURL("http://127.0.0.1:4173/");
});
