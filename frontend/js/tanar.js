import {
    sajatOsztalyokLekerese,
    osztalyNevsorLekerese
} from "./tanar/adatok.js";

import { osztalyokTartalma } from "./tanar/osztalyok.js";
import { nevsorTartalma } from "./tanar/nevsor.js";

const tartalom = document.getElementById("tanar-tartalom");
const osztalyokGomb = document.getElementById("osztalyok-gomb");

function betoltesInditasa(uzenet) {
    const hely = document.createElement("div");
    hely.textContent = uzenet;
    tartalom.replaceChildren(hely);
    return hely;
}

async function osztalyokMegnyitasa() {
    const hely = betoltesInditasa("Osztályok betöltése…");

    try {
        const osztalyok = await sajatOsztalyokLekerese();
        hely.replaceChildren(osztalyokTartalma(osztalyok, nevsorMegnyitasa));
    } catch (hiba) {
        hely.textContent = "Az osztályokat nem sikerült betölteni.";
        console.error(hiba);
    }
}

async function nevsorMegnyitasa(osztaly) {
    const hely = betoltesInditasa(`${osztaly.name} névsorának betöltése…`);

    try {
        const diakok = await osztalyNevsorLekerese(osztaly.id);
        hely.replaceChildren(nevsorTartalma(osztaly, diakok));
    } catch (hiba) {
        hely.textContent = "A névsort nem sikerült betölteni.";
        console.error(hiba);
    }
}

export function tanariFeluletInditasa() {
    osztalyokGomb.addEventListener("click", osztalyokMegnyitasa);
    const menu = document.querySelector("#top-nav details");

    menu.addEventListener("mouseleave", () => {
        menu.open = false;
    });
    
    return osztalyokMegnyitasa();
}