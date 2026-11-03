import { porgetesBeallitasLetrehozasa } from "./porgetes.js";

export function nevsorTartalma(osztaly, diakok, letszamValtozott) {
    const szakasz = document.createElement("section");

    const cim = document.createElement("h2");
    cim.textContent = `${osztaly.name} – ${diakok.length} fő`;
    szakasz.append(cim);

    const porgetes = porgetesBeallitasLetrehozasa();
    szakasz.append(porgetes.elem);    


    if (diakok.length === 0) {
        porgetes.letszamBeallitasa(0);
        letszamValtozott(0);
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
        const hianyzokSzama = torzs.querySelectorAll("input:checked").length;
        const jelenlevokSzama = diakok.length - hianyzokSzama;
        
        porgetes.letszamBeallitasa(jelenlevokSzama);
        letszamValtozott(jelenlevokSzama);
        
        letszam.textContent =
            `Jelen van ${jelenlevokSzama} fő · Hiányzik ${hianyzokSzama} fő`;
    }

    torzs.addEventListener("change", letszamFrissitese);
    letszamFrissitese();

    szakasz.append(letszam, porgetes.elem, tabla);

    return szakasz;
}