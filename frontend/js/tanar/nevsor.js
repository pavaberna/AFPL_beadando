import { porgetesBeallitasLetrehozasa } from "./porgetes.js";

export function nevsorTartalma(osztaly, diakok, jelenletValtozott) {
    const szakasz = document.createElement("section");

    const cim = document.createElement("h2");
    cim.textContent = `${osztaly.name} – ${diakok.length} fő`;
    szakasz.append(cim);

    const porgetes = porgetesBeallitasLetrehozasa();
    szakasz.append(porgetes.elem);    


    if (diakok.length === 0) {
        porgetes.letszamBeallitasa(0);
        jelenletValtozott([]);
        return szakasz;
    }

    const letszam = document.createElement("p");
    letszam.setAttribute("aria-live", "polite");

    const tabla = document.createElement("table");
    tabla.id = "nevsor";

    const fejlecSor = tabla.createTHead().insertRow();

    for (const felirat of ["H", "Tanuló neve", "Utoljára sorsolva"]) {
        const fejlecCella = document.createElement("th");
        fejlecCella.scope = "col";
        fejlecCella.textContent = felirat;
        fejlecSor.append(fejlecCella);
    }

    const torzs = tabla.createTBody();

    for (const diak of diakok) {
        const sor = torzs.insertRow();
        const hianyzikCella = sor.insertCell();
        const nevCella = sor.insertCell();
        const datumCella = sor.insertCell();
        datumCella.textContent = diak.last_drawn_on ?? "Még nem volt";

        const jelolo = document.createElement("input");
        jelolo.type = "checkbox";
        jelolo.id = `hianyzik-${diak.id}`;
        jelolo.name = "hianyzok";
        jelolo.value = diak.id;

        const nev = document.createElement("label");
        nev.htmlFor = jelolo.id;
        nev.textContent = diak.name;

        nevCella.append(nev);
        hianyzikCella.append(jelolo);
    }

    function letszamFrissitese() {
        const hianyzok = new Set(Array.from(torzs.querySelectorAll("input:checked"), jelolo => jelolo.value));
        const jelenlevok = diakok.filter(diak => !hianyzok.has(String(diak.id)));
        const jelenlevokSzama = jelenlevok.length;
        
        porgetes.letszamBeallitasa(jelenlevokSzama);
        jelenletValtozott(jelenlevok, porgetesInditasa);
        
        letszam.textContent =
            `Jelen van ${jelenlevokSzama} fő · Hiányzik ${hianyzok.size} fő`;
    }

    function porgetesInditasa(elerheto) {
        const beallitasok = porgetes.beallitasokRogzitese(elerheto);
        if (!beallitasok) return null;

        for (const jelolo of torzs.querySelectorAll("input")) {
            jelolo.disabled = true;
        }
        return beallitasok;
    }

    torzs.addEventListener("change", letszamFrissitese);
    letszamFrissitese();

    szakasz.append(letszam, porgetes.elem, tabla);

    return szakasz;
}