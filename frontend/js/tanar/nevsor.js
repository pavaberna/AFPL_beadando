import { porgetesBeallitasLetrehozasa } from "./porgetes.js";

export function nevsorTartalma(osztaly, diakok) {
    const szakasz = document.createElement("section");

    const cim = document.createElement("h2");
    cim.textContent = `${osztaly.name} – névsor`;
    
    const fejlec = document.createElement("div");
    fejlec.classList.add("nevsor-fejlec");
    fejlec.append(cim);
    szakasz.append(fejlec);

    const tajekoztato = document.createElement("p");
    szakasz.append(tajekoztato);

    if (diakok.length === 0) {
        tajekoztato.textContent = "Ebben az osztályban még nincs tanuló.";
        return szakasz;
    }

    tajekoztato.textContent = "Jelöld be a hiányzó tanulókat!";



    const letszam = document.createElement("p");
    letszam.setAttribute("aria-live", "polite");

    const tabla = document.createElement("table");
    tabla.classList.add("card");

    const fejlecSor = tabla.createTHead().insertRow();

    for (const felirat of ["Tanuló neve", "Hiányzik", "Utoljára sorsolva"]) {
        const fejlecCella = document.createElement("th");
        fejlecCella.scope = "col";
        fejlecCella.textContent = felirat;
        fejlecSor.append(fejlecCella);
    }

    const torzs = tabla.createTBody();

    for (const diak of diakok) {
        const sor = torzs.insertRow();
        const nevCella = sor.insertCell();
        const hianyzikCella = sor.insertCell();
        const datumCella = sor.insertCell();
        datumCella.textContent = diak.last_drawn_on ?? "Még nem volt kisorsolva";

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

    const porgetes = porgetesBeallitasLetrehozasa();
    fejlec.append(porgetes.elem);

    function letszamFrissitese() {
        const hianyzokSzama = torzs.querySelectorAll("input:checked").length;
        const jelenlevokSzama = diakok.length - hianyzokSzama;
        
        porgetes.letszamBeallitasa(jelenlevokSzama);

        letszam.textContent =
            `Jelen van ${jelenlevokSzama} fő · Hiányzik ${hianyzokSzama} fő`;
    }

    torzs.addEventListener("change", letszamFrissitese);
    letszamFrissitese();

    szakasz.append(letszam, tabla);

    return szakasz;
}