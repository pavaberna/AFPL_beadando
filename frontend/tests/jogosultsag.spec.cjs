const { test, expect } = require("@playwright/test");

// Megnyitja az oldalt a megadott szerepkörrel, és visszaadja a megjelent üzeneteket.
async function oldalMegnyitasa(page, oldal, role) {
    const uzenetek = [];

    page.on("dialog", async dialog => {
        uzenetek.push(dialog.message());
        await dialog.accept();
    });

    await page.route("**/backend/public/me.php", route => route.fulfill({
        json: { user: { role, display_name: "Teszt Felhasználó" } }
    }));

    // Az admin oldal indulása a backendtől kér adatot, amit a valódi backend tanárnak nem ad ki.
    await page.route("**/backend/public/admin/**", route => route.fulfill({
        status: 403,
        json: { error: "Ehhez a művelethez admin jogosultság kell" }
    }));

    await page.goto(oldal);

    return uzenetek;
}

test("Tanárként az admin oldalról visszakerülünk a kezdőoldalra", async ({ page }) => {
    const uzenetek = await oldalMegnyitasa(page, "/admin.html", "teacher");

    await expect(page).toHaveURL(/\/index\.html$/);
    expect(uzenetek).toEqual(["Ez az oldal csak adminként érhető el."]);
});

test("Adminként a tanári oldalról visszakerülünk a kezdőoldalra", async ({ page }) => {
    const uzenetek = await oldalMegnyitasa(page, "/tanar.html", "admin");

    await expect(page).toHaveURL(/\/index\.html$/);
    expect(uzenetek).toEqual(["Ez az oldal csak tanárként érhető el."]);
});
