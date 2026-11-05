import { nevModositasa } from "./adatok.js";

// A backend ugyanezt a határt ellenőrzi (MAX_DISPLAY_NAME_LENGTH).
const MAX_NEV_HOSSZ = 100;

function nevHibaja(nev) {
    if (!nev) {
        return "A név megadása kötelező.";
    }

    // Az Array.from karaktereket számol, a backendhez hasonlóan.
    if (Array.from(nev).length > MAX_NEV_HOSSZ) {
        return `A név legfeljebb ${MAX_NEV_HOSSZ} karakter hosszú lehet.`;
    }

    return "";
}

export function beallitasokInditasa() {
    const ablak = document.getElementById("beallitasok-dialog");
    const urlap = document.getElementById("beallitasok-urlap");
    const mezo = document.getElementById("beallitasok-nev");
    const temaMezo = document.getElementById("beallitasok-tema");
    const hibaHelye = document.getElementById("beallitasok-hiba");
    const megse = document.getElementById("beallitasok-megse");
    const mentes = urlap.querySelector('button[type="submit"]');
    const nevHelye = document.getElementById("belepesi-allapot");
    const beallitasokGomb = document.getElementById("beallitasok-gomb");

    let mentesFolyamatban = false;

    beallitasokGomb.addEventListener("click", () => {
        beallitasokGomb.closest("details").open = false;
        mezo.value = nevHelye.textContent;
        temaMezo.value = window.afplTema.lekeres();
        ablak.showModal();
    });

    megse.addEventListener("click", () => {
        ablak.close();
    });

    ablak.addEventListener("close", () => {
        hibaHelye.textContent = "";
    });

    // Mentés közben az Escape se zárja be az ablakot.
    ablak.addEventListener("cancel", event => {
        if (mentesFolyamatban) {
            event.preventDefault();
        }
    });

    urlap.addEventListener("submit", async event => {
        event.preventDefault();

        if (mentesFolyamatban) return;

        const nev = mezo.value.trim();

        hibaHelye.textContent = nevHibaja(nev);

        if (hibaHelye.textContent) return;

        const tema = temaMezo.value;
        mentesFolyamatban = true;
        mezo.disabled = true;
        temaMezo.disabled = true;
        mentes.disabled = true;
        megse.disabled = true;

        try {
            if (nev !== nevHelye.textContent) {
                const { user } = await nevModositasa(nev);
                nevHelye.textContent = user.display_name;
            }

            if (tema !== window.afplTema.lekeres()) {
                try {
                    window.afplTema.mentes(tema);
                } catch {
                    hibaHelye.textContent = "A témát nem sikerült elmenteni ebben a böngészőben.";
                    return;
                }
            }
            ablak.close();
        } catch (hiba) {
            // A status nélküli hiba (pl. hálózati) üzenete a felhasználónak nem mond semmit.
            hibaHelye.textContent = hiba.status
                ? hiba.message
                : "Nem sikerült elmenteni a nevet.";
            console.error(hiba);
        } finally {
            mentesFolyamatban = false;
            mezo.disabled = false;
            temaMezo.disabled = false;
            mentes.disabled = false;
            megse.disabled = false;
        }
    });
}
