export function porgetesBeallitasLetrehozasa() {
    let porgetesekSzama = 3;

    const elem = document.createElement("div");
    elem.innerHTML = `
        <p>
            Pörgetések száma: <strong class="porgetes-ertek">3</strong>
            <button type="button" class="modositas">Módosítás</button>
        </p>
        <dialog id="porgetes-dialog"aria-labelledby="porgetes-cim">
            <h3 id="porgetes-cim">Pörgetések beállítása</h3>
            <form>
                <label for="porgetes-darab">Pörgetések száma</label>
                <input id="porgetes-darab" type="number" min="3" step="1" required>
                <button type="submit">Mentés</button>
                <button type="button" class="megse">Mégse</button>
            </form>
        </dialog>
    `;

    const ertek = elem.querySelector(".porgetes-ertek");
    const modositas = elem.querySelector(".modositas");
    const ablak = elem.querySelector("dialog");
    const mezo = elem.querySelector("input");

    modositas.addEventListener("click", () => {
        mezo.value = porgetesekSzama;
        ablak.showModal();
    });

    elem.querySelector(".megse").addEventListener("click", () => {
        ablak.close();
    });

    elem.querySelector("form").addEventListener("submit", (event) => {
        event.preventDefault();
        porgetesekSzama = mezo.valueAsNumber;
        ertek.textContent = porgetesekSzama;
        ablak.close();
    });

    function letszamBeallitasa(jelenlevokSzama) {
        const kevesenVannak = jelenlevokSzama < 3;
        const mostKellJelezni = kevesenVannak && !modositas.disabled;

        modositas.disabled = kevesenVannak;
        mezo.max = jelenlevokSzama;

        if (kevesenVannak) {
            porgetesekSzama = 3;
            ertek.textContent = "–";

            if (mostKellJelezni) {
                alert("A pörgetéshez legalább 3 jelenlévő tanuló szükséges.");
            }
            return;
        }

        porgetesekSzama = Math.min(porgetesekSzama, jelenlevokSzama);
        ertek.textContent = porgetesekSzama;
    }

    return { elem, letszamBeallitasa };
}