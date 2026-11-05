import { diakHozzaadasa } from "./adatok.js";

const diakDialog = document.querySelector("#diak-dialog");
const diakUrlap = document.querySelector("#diak-urlap");
const diakOsztalyNev = document.querySelector("#diak-osztaly-nev");
const diakUrlapHiba = document.querySelector("#diak-urlap-hiba");
const diakMegse = document.querySelector("#diak-megse");

let megnyitoGomb;
let kivalasztottOsztalyId = null;
let diakMentesFolyamatban = false;


// A kiválasztott osztály sorában lévő insert gomb kezelése.
document.addEventListener("click", event => {
    const gomb = event.target.closest(
        'button[data-muvelet="diak-hozzaadas"]'
    );

    if (!gomb || gomb.disabled) return;
    if (diakMentesFolyamatban || diakDialog.open) return;

    event.preventDefault();

    const osztalyId = Number(gomb.dataset.id);

    if (!Number.isSafeInteger(osztalyId) || osztalyId <= 0) {
        alert("Az osztály azonosítója hibás.");
        return;
    }

    megnyitoGomb = gomb;
    kivalasztottOsztalyId = osztalyId;

    diakUrlap.reset();
    diakUrlapHiba.textContent = "";

    // Az osztálynevet szövegként jelenítjük meg.
    diakOsztalyNev.textContent = gomb.dataset.osztalyNev;

    diakDialog.showModal();
});


// Mégse gomb.
diakMegse.addEventListener("click", () => {
    if (diakMentesFolyamatban) return;

    diakDialog.close();
});


// Mentés közben az Escape se zárja be.
diakDialog.addEventListener("cancel", event => {
    if (diakMentesFolyamatban) {
        event.preventDefault();
    }
});


// Bezáráskor töröljük az előző felvétel adatait.
diakDialog.addEventListener("close", () => {
    diakUrlap.reset();
    diakUrlapHiba.textContent = "";
    diakOsztalyNev.textContent = "";
    kivalasztottOsztalyId = null;
});


// Diák mentése.
diakUrlap.addEventListener("submit", async event => {
    event.preventDefault();

    if (diakMentesFolyamatban) return;

    diakUrlapHiba.textContent = "";

    const mezok = new FormData(diakUrlap);
    const nev = mezok.get("name").trim();

    if (!nev) {
        diakUrlapHiba.textContent = "A diák neve kötelező.";
        return;
    }

    if (kivalasztottOsztalyId === null) {
        diakUrlapHiba.textContent = "Nincs kiválasztott osztály.";
        return;
    }

    const adatok = {
        name: nev,
        class_id: kivalasztottOsztalyId
    };

    const mentesGomb = diakUrlap.querySelector(
        'button[type="submit"]'
    );
    const eredetiFelirat = mentesGomb.textContent;

    diakMentesFolyamatban = true;
    mentesGomb.disabled = true;
    diakMegse.disabled = true;
    mentesGomb.textContent = "Mentés…";

    try {
        await diakHozzaadasa(adatok);

        diakDialog.close();
        megnyitoGomb.dispatchEvent(new Event("nevsor-frissites", { bubbles: true }));
    } catch (error) {
        if (error.status === 404) {
            diakUrlapHiba.textContent =
                "A kiválasztott osztály már nem létezik.";
        } else {
            diakUrlapHiba.textContent =
                error.message || "Nem sikerült elmenteni a diákot.";
        }
    } finally {
        diakMentesFolyamatban = false;
        mentesGomb.disabled = false;
        diakMegse.disabled = false;
        mentesGomb.textContent = eredetiFelirat;
    }
});
