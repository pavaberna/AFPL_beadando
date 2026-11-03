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

for (const automatikus of [false, true]) {
    test(automatikus ? "Egy kattintás végigpörgeti a beállított neveket" : "Kézi módban nevenként egy kattintás kell",
        async ({ page }) => {
            await page.emulateMedia({ reducedMotion: automatikus ? "no-preference" : "reduce" });
            await page.route("**/backend/public/me.php", route => route.fulfill({
                json: { user: { role: "teacher", display_name: "Teszt" } }
            }));
            await page.route("**/backend/public/teacher/classes.php*", route => route.fulfill({
                json: { classes: [{ id: 1, name: "9.A" }], students: diakok }
            }));
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
                await gomb.click();
            }
            await expect(gomb).toBeDisabled();
            await expect.poll(() => nevek.length, { timeout: 15000 }).toBe(3);
            expect(new Set(nevek).size).toBe(3);
            expect(diakok.slice(0, 4).map(d => d.name)).toEqual(expect.arrayContaining(nevek));
            await expect(eredmenyek).toHaveText(nevek);
        });
}
