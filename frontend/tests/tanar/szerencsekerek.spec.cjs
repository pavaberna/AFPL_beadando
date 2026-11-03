const { test, expect } = require("@playwright/test");
const { kerekSzeletek } = require("../../js/tanar/szerencsekerek.js");

const diakok = ["Kiss Anna Edit", "Nagy Péter", "Nagy Pál", "Tóth Éva"].map((name, index) => ({
    id: index + 1, name, weight: 1, last_drawn_on: null
}));

test("Három jelenlévőtől ID szerint külön szelet és rövidített név készül", () => {
    expect(kerekSzeletek(diakok.slice(0, 2))).toEqual([]);
    const szeletek = kerekSzeletek(diakok.slice(0, 3));
    expect(szeletek.map(szelet => szelet.felirat)).toEqual(["Kiss A. E.", "Nagy P.", "Nagy P."]);
    expect(szeletek.map(szelet => szelet.diak.id)).toEqual([1, 2, 3]);
    expect(szeletek.map(({ kezdet, kozep, veg }) => [kezdet, kozep, veg]))
        .toEqual([[0, 60, 120], [120, 180, 240], [240, 300, 360]]);
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
            await expect(page.locator(".kerek-szeletek text")).toHaveText(["Kiss A. E.", "Nagy P.", "Nagy P."]);
            await page.getByLabel("Összes név pörgetése egy kattintásra").setChecked(automatikus);
            await gomb.click();
            await expect(anna).toBeDisabled();
            if (automatikus) {
                await expect(gomb).toBeDisabled();
            } else {
                await expect.poll(() => nevek.length).toBe(1);
                await gomb.click();
                await expect.poll(() => nevek.length).toBe(2);
                await gomb.click();
            }
            await expect(gomb).toBeDisabled();
            await expect.poll(() => nevek.slice().sort(), { timeout: 15000 }).toEqual(diakok.slice(0, 3).map(d => d.name).sort());
        });
}
