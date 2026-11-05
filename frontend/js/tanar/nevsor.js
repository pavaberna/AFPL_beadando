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
    letszam.classList.add("nevsor-letszam");
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
        datumCella.textContent = diak.drawn_today ? "ma" : (diak.last_drawn_on ?? "Még nem volt");

        const jelolo = document.createElement("input");
        jelolo.type = "checkbox";
        jelolo.id = `hianyzik-${diak.id}`;
        jelolo.name = "hianyzok";
        jelolo.value = diak.id;
        jelolo.disabled = diak.drawn_today === true;

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
        
        const sorsolhatok = jelenlevok.filter(diak => !diak.drawn_today);
        const maximum = Math.max(0, sorsolhatok.length - 1);
        porgetes.letszamBeallitasa(maximum);
        jelenletValtozott(sorsolhatok, () => porgetesInditasa(maximum, hianyzok));
        
        letszam.textContent =
            `Jelen van ${jelenlevokSzama} fő · Hiányzik ${hianyzok.size} fő`;
    }

    function porgetesInditasa(maximum, hianyzok) {
        const beallitasok = porgetes.beallitasokRogzitese(maximum);
        if (!beallitasok) return null;

        for (const jelolo of torzs.querySelectorAll("input")) {
            jelolo.disabled = true;
        }
        return { ...beallitasok, hianyzok: Array.from(hianyzok, Number) };
    }

    torzs.addEventListener("change", letszamFrissitese);
    letszamFrissitese();

    szakasz.append(porgetes.elem, letszam, tabla);

    return szakasz;
}