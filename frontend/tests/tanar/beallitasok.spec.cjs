const { test, expect } = require("@playwright/test");

const EREDETI_NEV = "Teszt Tanár";

// Megnyitja a tanári oldalt, és visszaadja a névmódosítási kérések listáját.
async function oldalMegnyitasa(page, valasz) {
    const kuldottNevek = [];

    await page.route("**/backend/public/me.php", route => route.fulfill({
        json: { user: { role: "teacher", display_name: EREDETI_NEV } }
    }));

    await page.route("**/backend/public/teacher/classes.php*", route => route.fulfill({
        json: { classes: [{ id: 1, name: "9.A" }] }
    }));

    await page.route("**/backend/public/teacher/settings.php", route => {
        const nev = route.request().postDataJSON().display_name;

        kuldottNevek.push(nev);

        return route.fulfill(valasz ?? {
            json: { user: { role: "teacher", display_name: nev } }
        });
    });

    await page.goto("/tanar.html");

    // A menü feltöltése után a Beállítások gomb már használható.
    await expect(page.locator("#osztaly-lista button")).toHaveText("9.A");

    return kuldottNevek;
}

async function ablakMegnyitasa(page) {
    await page.locator("summary").filter({ has: page.locator("#belepesi-allapot") }).click();
    await page.getByRole("button", { name: "Beállítások" }).click();

    const ablak = page.getByRole("dialog");

    await expect(ablak).toBeVisible();

    return ablak;
}

test("A Beállítások ablak a jelenlegi névvel nyílik, a Mégse nem változtat rajta", async ({ page }) => {
    const kuldottNevek = await oldalMegnyitasa(page);
    const ablak = await ablakMegnyitasa(page);
    const mezo = ablak.getByRole("textbox", { name: "Név" });

    await expect(mezo).toHaveValue(EREDETI_NEV);

    await mezo.fill("Másik Név");
    await ablak.getByRole("button", { name: "Mégse" }).click();

    await expect(ablak).toBeHidden();
    await expect(page.locator("#belepesi-allapot")).toHaveText(EREDETI_NEV);
    expect(kuldottNevek).toEqual([]);
});

test("Az üres és a 100 karakternél hosszabb név nem küldhető el", async ({ page }) => {
    const kuldottNevek = await oldalMegnyitasa(page);
    const ablak = await ablakMegnyitasa(page);
    const mezo = ablak.getByRole("textbox", { name: "Név" });
    const mentes = ablak.getByRole("button", { name: "Mentés" });
    const hiba = ablak.getByRole("alert");

    for (const uresNev of ["", "    "]) {
        await mezo.fill(uresNev);
        await mentes.click();

        await expect(hiba).toHaveText("A név megadása kötelező.");
        await expect(ablak).toBeVisible();
    }

    await mezo.fill("á".repeat(101));
    await mentes.click();

    await expect(hiba).toHaveText("A név legfeljebb 100 karakter hosszú lehet.");
    await expect(ablak).toBeVisible();
    expect(kuldottNevek).toEqual([]);

    // Pontosan 100 karakter még menthető, az ékezetes betű egy karakternek számít.
    await mezo.fill("á".repeat(100));
    await mentes.click();

    await expect(ablak).toBeHidden();
    expect(kuldottNevek).toEqual(["á".repeat(100)]);
});

test("Sikeres mentés után az új név rögtön megjelenik a menüben", async ({ page }) => {
    const kuldottNevek = await oldalMegnyitasa(page);
    let ablak = await ablakMegnyitasa(page);

    await ablak.getByRole("textbox", { name: "Név" }).fill("  Új Név  ");
    await ablak.getByRole("button", { name: "Mentés" }).click();

    await expect(ablak).toBeHidden();
    await expect(page.locator("#belepesi-allapot")).toHaveText("Új Név");
    expect(kuldottNevek).toEqual(["Új Név"]);

    // Újranyitáskor már az új név szerepel a mezőben.
    ablak = await ablakMegnyitasa(page);
    await expect(ablak.getByRole("textbox", { name: "Név" })).toHaveValue("Új Név");
});

test("A backend hibaüzenete megjelenik, az ablak nyitva marad, a név nem változik", async ({ page }) => {
    await oldalMegnyitasa(page, {
        status: 400,
        json: { error: "A név egysoros, legfeljebb 100 karakter hosszú lehet" }
    });
    const ablak = await ablakMegnyitasa(page);

    await ablak.getByRole("textbox", { name: "Név" }).fill("Új Név");
    await ablak.getByRole("button", { name: "Mentés" }).click();

    await expect(ablak.getByRole("alert")).toHaveText(
        "A név egysoros, legfeljebb 100 karakter hosszú lehet"
    );
    await expect(ablak).toBeVisible();
    await expect(page.locator("#belepesi-allapot")).toHaveText(EREDETI_NEV);
});

test("Nem JSON válasznál általános hibaüzenet jelenik meg", async ({ page }) => {
    await oldalMegnyitasa(page, { status: 500, body: "<html>Hiba</html>" });
    const ablak = await ablakMegnyitasa(page);

    await ablak.getByRole("textbox", { name: "Név" }).fill("Új Név");
    await ablak.getByRole("button", { name: "Mentés" }).click();

    await expect(ablak.getByRole("alert")).toHaveText("Nem sikerült elmenteni a nevet.");
    await expect(ablak).toBeVisible();
});
