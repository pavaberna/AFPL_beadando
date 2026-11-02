const { test, expect } = require("@playwright/test");
const { datumFormazasa } = require("../js/datum.js");

test("A dátum magyarul, teljes hónapnévvel jelenik meg", () => {
    const datum = new Date(2026, 10, 2);

    expect(datumFormazasa(datum)).toBe("2026. november 2.");
});