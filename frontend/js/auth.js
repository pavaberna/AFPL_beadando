// A bejelentkezett felhasználó nevének megjelenítése.
async function belepesiAllapotFrissitese() {
    const hely = document.querySelector("#belepesi-allapot");

    if (!hely) return;

    try {
        const response = await fetch("backend/public/me.php", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.status === 401) {
            hely.textContent = "Nincs bejelentkezve.";
            return;
        }

        if (!response.ok) {
            throw new Error("A belépési állapot nem kérdezhető le.");
        }

        const data = await response.json();

        hely.textContent = data.user.username;
    } catch (error) {
        hely.textContent = "A belépési állapot nem tölthető be.";
        console.error(error);
    }
}

// A később betöltött fejlécben lévő gombot is kezeli.
document.addEventListener("click", async (event) => {
    const gomb = event.target.closest("#kijelentkezes");

    if (!gomb || gomb.disabled) return;

    event.preventDefault();
    gomb.disabled = true;

    try {
        const response = await fetch("backend/public/logout.php", {
            method: "POST",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Sikertelen kijelentkezés.");
        }

        // A backend már megszüntette a bejelentkezést.
        window.location.replace("./");
    } catch (error) {
        alert("Nem sikerült kijelentkezni. Próbáld újra!");
        console.error(error);
        gomb.disabled = false;
    }
});

async function belepesEllenorzese() {
    const tartalom = document.querySelector("#vedett-tartalom");

    // Ha nincs védett tartalom, nincs teendő.
    if (!tartalom) return;

    try {
        const response = await fetch("backend/public/me.php", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.status === 401) {
            alert("Nincs bejelentkezve!");
            window.location.replace("index.html");
            return;
        }

        if (!response.ok) {
            throw new Error("Nem sikerült ellenőrizni a bejelentkezést.");
        }

        // Sikeres ellenőrzés után megmutatjuk a tartalmat.
        tartalom.hidden = false;
    } catch (hiba) {
        console.error(hiba);
        alert("A bejelentkezés nem ellenőrizhető. Kérlek, próbáld újra!");
        window.location.replace("index.html");
    }
}

// Oldalbetöltéskor lefuttatjuk.
belepesEllenorzese();
belepesiAllapotFrissitese();
