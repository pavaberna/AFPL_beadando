const { test, expect } = require("@playwright/test");
const { kerekSzeletek } = require("../../js/tanar/szerencsekerek.js");

const diakok = ["Kiss Anna Edit", "Nagy Péter", "Nagy Pál", "Kerekes Imre", "Tóth Éva"].map((name, index) => ({
    id: index + 1, name, weight: 1, last_drawn_on: null
}));

test("Négy jelenlévőtől ID szerint külön szelet és rövidített név készül", () => {
    expect(kerekSzeletek(diakok.slice(0, 3))).toEqual([]);
    const szeletek = kerekSzeletek(diakok.slice(0, 4));
    expect(szeletek.map(szelet => szelet.felirat)).toEqual(["Kiss A. E.", "Nagy P.", "Nagy P.", "Kerekes I."]);
    expect(szeletek.map(szelet => szelet.diak.id)).toEqual([1, 2, 3, 4]);
    expect(szeletek.map(({ kezdet, kozep, veg }) => [kezdet, kozep, veg]))
        .toEqual([[0, 45, 90], [90, 135, 180], [180, 225, 270], [270, 315, 360]]);
});

async function tanariApi(page, students = diakok) {
    await page.route("**/backend/public/me.php", route => route.fulfill({
        json: { user: { role: "teacher", display_name: "Teszt" } }
    }));
    await page.route("**/backend/public/teacher/classes.php*", route => route.fulfill({
        json: { classes: [{ id: 1, name: "9.A" }], students }
    }));
}

for (const automatikus of [false, true]) {
    test(automatikus ? "Egy kattintás végigpörgeti a beállított neveket" : "Kézi módban nevenként egy kattintás kell",
        async ({ page }) => {
            await page.emulateMedia({ reducedMotion: automatikus ? "no-preference" : "reduce" });
            await tanariApi(page);
            const keresTorzsek = [];
            const nyertesek = [diakok[2], diakok[0]];
            await page.route("**/backend/public/teacher/draw.php", route => {
                expect(route.request().method()).toBe("POST");
                keresTorzsek.push(route.request().postDataJSON());
                return route.fulfill({ status: 201, json: { drawn_on: "2026-11-04", students: nyertesek } });
            });
            const nevek = [];
            page.on("console", msg => {
                if (msg.type() === "log") nevek.push(msg.text());
            });
            await page.goto("/tanar.html");
            const gomb = page.getByRole("button", { name: "Pörgetés", exact: true });
            await expect(gomb).toBeHidden();
            await page.locator("#osztaly-menu summary").click();
            await page.getByRole("button", { name: "9.A" }).click();
            await page.getByLabel("Tóth Éva", { exact: true }).check();
            const anna = page.getByLabel("Kiss Anna Edit", { exact: true });
            await anna.check();
            await expect(gomb).toBeHidden();
            await anna.uncheck();
            await expect(page.locator(".kerek-szeletek text")).toHaveText(["Kiss A. E.", "Nagy P.", "Nagy P.", "Kerekes I."]);
            await page.getByLabel("Összes név pörgetése egy kattintásra").setChecked(automatikus);
            const eredmenyek = page.locator("#tanar-tartalom ol li");
            await expect(eredmenyek).toHaveCount(0);
            await gomb.click();
            await expect(page.getByRole("heading", { name: "9.A – Mai sorsolás" })).toBeVisible();
            await expect(page.locator("#nevsor")).toHaveCount(0);
            if (automatikus) {
                await expect(gomb).toBeDisabled();
                await expect(eredmenyek).toHaveCount(0);
            } else {
                await expect(eredmenyek).toHaveCount(1);
                await gomb.click();
                await expect(eredmenyek).toHaveCount(2);
            }
            await expect(gomb).toBeDisabled();
            await expect(eredmenyek).toHaveText(nyertesek.map(diak => diak.name), { timeout: 15000 });
            expect(nevek).toEqual(nyertesek.map(diak => diak.name));
            expect(keresTorzsek).toEqual([{ class_id: 1, count: 3, absent_ids: [5] }]);
        });
}

test("A ma már sorsoltak csak a pörgethető létszámot csökkentik", async ({ page }) => {
    await tanariApi(page, diakok.map(diak => ({ ...diak, drawn_today: diak.id <= 2 })));
    await page.goto("/tanar.html");
    await page.locator("#osztaly-menu summary").click();
    await page.getByRole("button", { name: "9.A" }).click();
    await expect(page.locator("#porgetes-darab option")).toHaveText(["3"]);
    await expect(page.locator(".kerek-szeletek text")).toHaveCount(5);
    await page.getByLabel("Tóth Éva", { exact: true }).check();
    await expect(page.locator("#kerek-porgetes")).toBeHidden();
    await expect(page.locator("#kerek-uzenet")).toContainText("ma már nem sorsolható");
});

for (const status of [200, 409]) {
    test(`A ${status} válasz után nincs pörgetés vagy automatikus újrakérés`, async ({ page }) => {
        await tanariApi(page);
        let valaszEngedelyezese;
        const varakozas = new Promise(resolve => { valaszEngedelyezese = resolve; });
        let keresek = 0;
        await page.route("**/backend/public/teacher/draw.php", async route => {
            keresek++;
            await varakozas;
            const json = status === 200 ? { drawn_on: "2026-11-04", students: [] }
                : { error: "Közben egy másik sorsolás is futott ebben az osztályban." };
            await route.fulfill({ status, json });
        });
        await page.goto("/tanar.html");
        await page.locator("#osztaly-menu summary").click();
        await page.getByRole("button", { name: "9.A" }).click();
        const gomb = page.locator("#kerek-porgetes");
        await gomb.click();
        await expect(gomb).toBeDisabled();
        await gomb.evaluate(elem => elem.click());
        valaszEngedelyezese();
        await expect(page.locator("#kerek-uzenet")).toContainText(status === 200 ? "nincs sorsolható" : "másik sorsolás");
        await expect(page.locator("#tanar-tartalom li")).toHaveCount(0);
        expect(keresek).toBe(1);
    });
}
