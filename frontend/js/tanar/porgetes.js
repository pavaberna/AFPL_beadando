export const minimumJelenlevo = 4;

export function porgetesBeallitasLetrehozasa() {
    const elem = document.createElement("div");

    elem.innerHTML = `
        <label>
            Pörgetések száma:
            <select id="porgetes-darab"></select>
        </label>
        <label hidden>
            <input type="checkbox" id="automatikus-porgetes">
            Összes név pörgetése egy kattintásra
        </label>
        <p role="status" hidden>Nincs elég diák a pörgetéshez.</p>
    `;

    const cimke = elem.querySelector("label");
    const valaszto = elem.querySelector("select");
    const automatikus = elem.querySelector("input");
    const uzenet = elem.querySelector("p");

    function letszamBeallitasa(jelenlevokSzama) {
        const maximum = jelenlevokSzama - 1;
        const kevesenVannak = jelenlevokSzama < minimumJelenlevo;
        const elozoErtek = Number(valaszto.value) || 3;

        cimke.hidden = kevesenVannak;
        automatikus.parentElement.hidden = kevesenVannak;
        valaszto.disabled = kevesenVannak;
        uzenet.hidden = !kevesenVannak;

        valaszto.replaceChildren();

        if (kevesenVannak) return;

        for (let darab = 3; darab <= maximum; darab++) {
            valaszto.add(new Option(darab, darab));
        }

        valaszto.value = Math.min(elozoErtek, maximum);
    }

    function beallitasokRogzitese(jelenlevokSzama) {
        const darab = Number(valaszto.value);
        if (!Number.isInteger(darab) || darab < 3 || darab >= jelenlevokSzama) {
            valaszto.setCustomValidity("Legalább 3 nevet válassz, és legalább egy jelenlévő maradjon ki.");
            valaszto.reportValidity();
            valaszto.setCustomValidity("");
            return null;
        }
        valaszto.disabled = true;
        automatikus.disabled = true;
        return { darab, automatikus: automatikus.checked };
    }

    return { elem, letszamBeallitasa, beallitasokRogzitese };
}