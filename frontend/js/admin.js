import {
    tanarokLekerese,
    osztalyokLekerese
} from "./admin/adatok.js";

import { dashboardTartalma } from "./admin/dashboard.js";
import { tanarokTartalma } from "./admin/tanarok.js";
import { osztalyokTartalma } from "./admin/osztalyok.js";
import "./admin/diakok.js";
import "./admin/beallitasok.js";

// Az egyes menüpontokhoz tartozó műveletek.
const nezetek = {
    osztalyok: {
        lekeres: osztalyokLekerese,
        feldolgozas: osztalyokTartalma
    },

    tanarok: {
        lekeres: tanarokLekerese,
        feldolgozas: tanarokTartalma
    }
};

let betoltesFolyamatban = false;


// A nézetválasztó gombok letiltása vagy engedélyezése.
function nezetGombokTiltasa(tiltva) {
    document.querySelectorAll(
        "button[data-nezet], #dashboard-gomb"
    ).forEach(gomb => {
        gomb.disabled = tiltva;
    });
}


// Dashboard: adatlekérés és átadás feldolgozásra.
async function dashboardFrissitese() {
    if (betoltesFolyamatban) return;

    betoltesFolyamatban = true;
    nezetGombokTiltasa(true);

    try {
        const [tanarok, osztalyok] = await Promise.all([
            tanarokLekerese(),
            osztalyokLekerese()
        ]);

        dashboardTartalma({
            tanarok,
            osztalyok,
            tanarokSzama: tanarok.length,
            osztalyokSzama: osztalyok.length
        });
    } catch (error) {
        console.error("A dashboard adatai nem tölthetők be.", error);
    } finally {
        betoltesFolyamatban = false;
        nezetGombokTiltasa(false);
    }
}


// A kiválasztott lista lekérése és átadása feldolgozásra.
async function nezetMegnyitasa(nezetNev) {
    if (!Object.hasOwn(nezetek, nezetNev)) return;
    if (betoltesFolyamatban) return;

    const nezet = nezetek[nezetNev];

    betoltesFolyamatban = true;
    nezetGombokTiltasa(true);

    try {
        const adatok = await nezet.lekeres();

        nezet.feldolgozas(adatok);
    } catch (error) {
        console.error("A lista adatai nem tölthetők be.", error);
    } finally {
        betoltesFolyamatban = false;
        nezetGombokTiltasa(false);
    }
}

// A később betöltött menügombokat is kezeli.
document.addEventListener("click", event => {
    const dashboardGomb = event.target.closest("#dashboard-gomb");

    if (dashboardGomb) {
        if (dashboardGomb.disabled) return;

        event.preventDefault();
        dashboardFrissitese();
        return;
    }

    const gomb = event.target.closest("button[data-nezet]");

    if (!gomb || gomb.disabled) return;

    event.preventDefault();
    nezetMegnyitasa(gomb.dataset.nezet);
});


// Oldalinduláskor a dashboard adatait dolgozzuk fel.
dashboardFrissitese();