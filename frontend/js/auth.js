// A bejelentkezett felhasználó nevének megjelenítése.
async function belepesiAllapotFrissitese() {
    const hely = document.querySelector("#belepesi-allapot");

    if (!hely) return;

    await apiRequest({
        url: "backend/public/me.php",
        cache: "no-store",

        onSuccess: (data) => {
            hely.textContent = data.user.username;
        },

        onError: (error) => {
            if (error.status === 401) {
                hely.textContent = "Nincs bejelentkezve.";
                return;
            }

            hely.textContent = "A belépési állapot nem tölthető be.";
            console.error(error);
        }
    });
}


// A később betöltött fejlécben lévő gombot is kezeli.
document.addEventListener("click", async (event) => {
    const gomb = event.target.closest("#kijelentkezes");

    if (!gomb || gomb.disabled) return;

    event.preventDefault();
    gomb.disabled = true;

    await apiRequest({
        url: "backend/public/logout.php",
        method: "POST",

        onSuccess: () => {
            // A backend már megszüntette a bejelentkezést.
            window.location.replace("./");
        },

        onError: (error) => {
            alert("Nem sikerült kijelentkezni. Próbáld újra!");
            console.error(error);

            // Hiba után újra meg lehet próbálni.
            gomb.disabled = false;
        }
    });
});


async function belepesEllenorzese() {
    const tartalom = document.querySelector("#vedett-tartalom");

    if (!tartalom) return;

    await apiRequest({
        url: "backend/public/me.php",
        cache: "no-store",

        onSuccess: () => {
            // Sikeres ellenőrzés után megmutatjuk a tartalmat.
            tartalom.hidden = false;
        },

        onError: (error) => {
            if (error.status === 401) {
                alert("Nincs bejelentkezve!");
            } else {
                console.error(error);
                alert(
                    "A bejelentkezés nem ellenőrizhető. Kérlek, próbáld újra!"
                );
            }

            window.location.replace("index.html");
        }
    });
}


// Oldalbetöltéskor lefuttatjuk.
belepesEllenorzese();
belepesiAllapotFrissitese();