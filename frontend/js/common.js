async function reszletBetoltese(azonosito, fajl) {
    const hely = document.getElementById(azonosito);

    if (!hely) {
        throw new Error(`Hiányzó HTML-elem: ${azonosito}`);
    }

    try {
        const valasz = await fetch(fajl);

        if (!valasz.ok) {
            throw new Error(`Betöltési hiba: ${fajl} (${valasz.status})`);
        }

        hely.innerHTML = await valasz.text();
    } catch (hiba) {
        hely.textContent = "Az oldal ezen része nem tölthető be.";
        throw hiba;
    }
}

async function kozosReszekBetoltese() {
    try {
        // Először betöltjük a közös fejlécet és láblécet.
        await Promise.all([
            reszletBetoltese("kozos-fejlec", "partials/header.html"),
            reszletBetoltese("kozos-lablec", "partials/footer.html")
        ]);

        // Ezután a JSON alapján elkészítjük a menüt.
        await menuBetoltese();

         // Megjelenítjük a bejelentkezett felhasználó nevét, a már belépett
        if (typeof belepesiAllapotFrissitese === "function") {
            await belepesiAllapotFrissitese();
        }

        // Jelezzük, hogy a menü elemei már használhatók.
        document.dispatchEvent(new Event("menu-betoltve"));
    } catch (hiba) {
        console.error(hiba);
    }
}
kozosReszekBetoltese();

async function menuBetoltese() {
    const valasz = await fetch("partials/menus.json");

    if (!valasz.ok) {
        throw new Error("A menü adatai nem tölthetők be.");
    }

    const menuk = await valasz.json();
    const oldal = document.body.dataset.oldal;
    const menu = menuk[oldal];

    if (!Array.isArray(menu)) {
        throw new Error(`Nincs menü ehhez az oldalhoz: ${oldal}`);
    }

    const hely = document.getElementById("oldal-menu");
    hely.replaceChildren();

    menu.forEach(adat => {
        hely.append(menuElemLetrehozasa(adat));
    });
}

function menuElemLetrehozasa(adat) {
    let elem;

    switch (adat.tipus) {
        case "link":
            elem = document.createElement("a");
            elem.href = adat.href;
            elem.textContent = adat.szoveg;
            break;

        case "gomb":
            elem = document.createElement("button");
            elem.type = "button";
            elem.textContent = adat.szoveg;
            break;

        case "lista":
            elem = document.createElement("select");

            adat.opciok.forEach(opcio => {
                elem.add(new Option(opcio.szoveg, opcio.ertek));
            });
            break;

        case "szam":
            elem = document.createElement("input");
            elem.type = "number";
            elem.min = adat.min;
            elem.step = 1;
            elem.value = adat.ertek;
            break;

        default:
            throw new Error(`Ismeretlen menüelemtípus: ${adat.tipus}`);
    }

    if (adat.id) {
        elem.id = adat.id;
    }

    // A beviteli mezők látható feliratot is kapnak.
    if (adat.tipus === "lista" || adat.tipus === "szam") {
        const csoport = document.createElement("div");
        csoport.className = "menu-mezo";

        const felirat = document.createElement("label");
        felirat.htmlFor = adat.id;
        felirat.textContent = adat.szoveg;

        csoport.append(felirat, elem);
        return csoport;
    }

    return elem;
}