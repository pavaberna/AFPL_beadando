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

    const osztalyMenu = page.locator("#osztaly-menu");

    await expect(page.locator("#tanar-tartalom table")).toHaveCount(0);
    await osztalyMenu.locator("summary").click();
    await osztalyMenu.getByRole("button", { name: "9.A", exact: true }).click();

    await expect(osztalyMenu).not.toHaveAttribute("open", "");
    await expect(osztalyMenu.locator("summary")).toHaveText("Osztályok ▾");

    const valaszto = page.getByLabel("Pörgetések száma:");
    const opciok = valaszto.locator("option");
    const uzenet = page.getByText("Nincs elég diák a pörgetéshez.", { exact: true });

    await expect(page.getByRole("heading", { name: "9.A – 5 fő" })).toBeVisible();
    await expect(opciok).toHaveText(["3", "4", "5"]);
    await expect(valaszto).toHaveValue("3");
    await expect(uzenet).toBeHidden();

    await valaszto.selectOption("5");
    await page.getByLabel("Anna", { exact: true }).check();

    await expect(opciok).toHaveText(["3", "4"]);
    await expect(valaszto).toHaveValue("4");

    await page.getByLabel("Béla", { exact: true }).check();
    await expect(opciok).toHaveText(["3"]);
    await expect(valaszto).toHaveValue("3");

    await page.getByLabel("Csilla", { exact: true }).check();
    await expect(valaszto).toBeHidden();
    await expect(uzenet).toBeVisible();

    await page.getByLabel("Csilla", { exact: true }).uncheck();
    await expect(valaszto).toBeVisible();
    await expect(valaszto).toHaveValue("3");
    await expect(uzenet).toBeHidden();
});