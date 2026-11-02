const { test, expect } = require("@playwright/test");

test("A pörgetések száma 3 és a jelenlévők száma közötti egész szám", async ({ page }) => {
    const osztaly = { id: 1, name: "9.A" };
    const diakok = ["Anna", "Béla", "Csilla", "Dénes", "Éva"].map((name, index) => ({
        id: index + 1,
        name,
        last_drawn_on: null
    }));

    // A teszt mindig ugyanazzal az öt tanulóval indul.
    await page.route("**/backend/public/me.php", route => route.fulfill({
        json: { user: { role: "teacher", display_name: "Teszt Tanár" } }
    }));

    await page.route("**/backend/public/teacher/classes.php*", route => {
        const url = new URL(route.request().url());
        const adatok = { classes: [osztaly] };

        if (url.searchParams.get("class_id") === "1") {
            adatok.students = diakok;
        }

        return route.fulfill({ json: adatok });
    });

    await page.goto("/tanar.html");
    await page.getByRole("button", { name: "9.A", exact: true }).click();

    const modositas = page.getByRole("button", { name: "Módosítás" });
    const ablak = page.getByRole("dialog");
    const mezo = ablak.getByRole("spinbutton");
    const mentes = ablak.getByRole("button", { name: "Mentés" });
    const kijelzettErtek = page.locator(".porgetes-ertek");

    await expect(kijelzettErtek).toHaveText("3");
    await modositas.click();

    // Üres, negatív, nulla, minimum alatti, tört és túl nagy érték.
    for (const hibasErtek of ["", "-1", "0", "2", "3.5", "6"]) {
        await mezo.fill(hibasErtek);
        await mentes.click();

        await expect(ablak).toBeVisible();
        await expect(kijelzettErtek).toHaveText("3");
    }

    // Öt jelenlévőnél pontosan öt pörgetés még menthető.
    await mezo.fill("5");
    await mentes.click();
    await expect(ablak).toBeHidden();
    await expect(kijelzettErtek).toHaveText("5");

    // Egy hiányzó után már csak négy pörgetés engedélyezett.
    await page.getByRole("checkbox", { name: "Anna", exact: true }).check();
    await expect(kijelzettErtek).toHaveText("4");

    await modositas.click();
    await mezo.fill("5");
    await mentes.click();
    await expect(ablak).toBeVisible();
    await expect(kijelzettErtek).toHaveText("4");

    // Az alsó határ is menthető.
    await mezo.fill("3");
    await mentes.click();
    await expect(ablak).toBeHidden();
    await expect(kijelzettErtek).toHaveText("3");
});