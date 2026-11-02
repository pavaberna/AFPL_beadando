export function osztalyokTartalma(osztalyok, osztalyKivalasztasa) {
    const szakasz = document.createElement("section");

    const cim = document.createElement("h2");
    cim.textContent = "Osztályaim";
    szakasz.append(cim);

    if (osztalyok.length === 0) {
        const uzenet = document.createElement("p");
        uzenet.textContent = "Még nincs hozzád rendelt osztály.";
        szakasz.append(uzenet);
        return szakasz;
    }

    const gombok = document.createElement("div");
    gombok.classList.add("osztaly-gombok","flex-x");

    for (const osztaly of osztalyok) {
        const gomb = document.createElement("button");
        gomb.classList.add("card");
        gomb.type = "button";
        gomb.textContent = osztaly.name;
        gomb.addEventListener("click", () => osztalyKivalasztasa(osztaly));
        gombok.append(gomb);
    }

    szakasz.append(gombok);
    return szakasz;
}