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
        const kevesenVannak = jelenlevokSzama < 3;
        const elozoErtek = Number(valaszto.value) || 3;

        cimke.hidden = kevesenVannak;
        automatikus.parentElement.hidden = kevesenVannak;
        valaszto.disabled = kevesenVannak;
        uzenet.hidden = !kevesenVannak;

        valaszto.replaceChildren();

        if (kevesenVannak) return;

        for (let darab = 3; darab <= jelenlevokSzama; darab++) {
            valaszto.add(new Option(darab, darab));
        }

        valaszto.value = Math.min(elozoErtek, jelenlevokSzama);
    }

    function beallitasokRogzitese(elerheto) {
        if (Number(valaszto.value) > elerheto) {
            valaszto.setCustomValidity(`Ma még ${elerheto} jelenlévő tanuló sorsolható.`);
            valaszto.reportValidity();
            valaszto.setCustomValidity("");
            return null;
        }
        valaszto.disabled = true;
        automatikus.disabled = true;
        return { darab: Number(valaszto.value), automatikus: automatikus.checked };
    }

    return { elem, letszamBeallitasa, beallitasokRogzitese };
}