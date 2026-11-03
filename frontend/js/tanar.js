import {
    sajatOsztalyokLekerese,
    osztalyNevsorLekerese
} from "./tanar/adatok.js";

import { szerencsekerekLetrehozasa } from "./tanar/szerencsekerek.js";
import { minimumJelenlevo } from "./tanar/porgetes.js";
import { nevsorTartalma } from "./tanar/nevsor.js";

const tartalom = document.getElementById("tanar-tartalom");
const kerekPanel = document.getElementById("kerek-tartalom");
const osztalyMenu = document.getElementById("osztaly-menu");
const osztalyLista = document.getElementById("osztaly-lista");

function betoltesInditasa(uzenet) {
    const hely = document.createElement("div");
    hely.textContent = uzenet;
    tartalom.replaceChildren(hely);
    return hely;
}

async function osztalyValasztoBetoltese() {
    try {
        const osztalyok = await sajatOsztalyokLekerese();

        if (osztalyok.length === 0) {
            tartalom.textContent = "Még nincs hozzád rendelt osztály.";
            return;
        }

        for (const osztaly of osztalyok) {
            const gomb = document.createElement("button");
            gomb.type = "button";
            gomb.classList.add("menu-item");
            gomb.textContent = osztaly.name;

            gomb.addEventListener("click", () => {
                osztalyMenu.open = false;
                osztalyMenu.querySelector("summary").focus();
                nevsorMegnyitasa(osztaly);
            });

            osztalyLista.append(gomb);
        }
        
    } catch (hiba) {
        tartalom.textContent = "Az osztályokat nem sikerült betölteni.";
        console.error(hiba);
    }
}

function kerekAllapotFrissitese(uzenet) {
    const kerekUzenet = document.getElementById("kerek-uzenet");
    const kerekTartalom = document.getElementById("kerek-tartalom");

    kerekUzenet.textContent = uzenet;
    kerekUzenet.hidden = uzenet === "";
    kerekTartalom.hidden = uzenet !== "";
}

async function nevsorMegnyitasa(osztaly) {
    const hely = betoltesInditasa(`${osztaly.name} névsorának betöltése…`);
    const eredmenyek = document.createElement("ol");
    eredmenyek.setAttribute("aria-live", "polite");
    function eredmenylistaMegnyitasa() {
        const cim = document.createElement("h2");
        cim.textContent = `${osztaly.name} – Mai sorsolás`;
        hely.replaceChildren(cim, eredmenyek);
    }

    const kerek = szerencsekerekLetrehozasa(kerekPanel, diak => {
        const sor = document.createElement("li");
        sor.textContent = diak.name;
        eredmenyek.append(sor);
    }, eredmenylistaMegnyitasa);
    kerekAllapotFrissitese("A névsor betöltése folyamatban…");

    try {
        const diakok = await osztalyNevsorLekerese(osztaly.id);

        // Ha közben másik osztályt választottak, már annak a névsora számít.
        if (!hely.isConnected) return;

        const nevsor = nevsorTartalma(osztaly, diakok, (jelenlevok, inditas) => {
            const uzenet = jelenlevok.length < minimumJelenlevo
                ? `A pörgetéshez legalább ${minimumJelenlevo} jelenlévő tanuló szükséges.`
                : "";

            kerekAllapotFrissitese(uzenet);
            if (!uzenet) kerek(jelenlevok, inditas);
        });

        hely.replaceChildren(nevsor);
    } catch (hiba) {
        if (!hely.isConnected) return;

        hely.textContent = "A névsort nem sikerült betölteni.";
        kerekAllapotFrissitese("A pörgetéshez előbb be kell tölteni a névsort.");
        console.error(hiba);
    }
}

export function tanariFeluletInditasa() {
    for (const menu of document.querySelectorAll("#top-nav details")) {
        menu.addEventListener("mouseleave", () => {
            menu.open = false;
        });
    }

    return osztalyValasztoBetoltese();
}
