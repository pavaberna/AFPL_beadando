export const minimumPorgetes = 3;

export const minimumSorsolhato = minimumPorgetes + 1;

export function porgetesBeallitasLetrehozasa() {
    const elem = document.createElement("fieldset");
    elem.classList.add("porgetes-beallitasok");

    elem.innerHTML = `
        <legend>Pörgetés beállításai</legend>
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

    function letszamBeallitasa(maximum) {
        const kevesenVannak = maximum < minimumPorgetes;
        const elozoErtek = Number(valaszto.value) || minimumPorgetes;

        cimke.hidden = kevesenVannak;
        automatikus.parentElement.hidden = kevesenVannak;
        valaszto.disabled = kevesenVannak;
        uzenet.hidden = !kevesenVannak;

        valaszto.replaceChildren();

        if (kevesenVannak) return;

        for (let darab = minimumPorgetes; darab <= maximum; darab++) {
            valaszto.add(new Option(darab, darab));
        }

        valaszto.value = Math.min(elozoErtek, maximum);
    }

    function beallitasokRogzitese(maximum) {
        const darab = Number(valaszto.value);
        if (!Number.isInteger(darab) || darab < minimumPorgetes || darab > maximum) {
            valaszto.setCustomValidity("Legalább 3 nevet válassz, és legalább egy sorsolható diák maradjon ki.");
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