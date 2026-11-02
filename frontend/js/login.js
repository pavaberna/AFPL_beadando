const urlap = document.querySelector("#bejelentkezes");

// Sikeres válasz után ezt hívja meg az apiRequest.
function sikeresBejelentkezes(data) {
    if (data.user.role === "admin") {
        window.location.href = "admin.html";
    } else if (data.user.role === "teacher") {
        window.location.href = "tanar.html";
    }
}

// Hiba esetén ezt hívja meg az apiRequest.
function sikertelenBejelentkezes(error) {
    if (error.status) {
        // A backend hibaválaszt adott.
        alert(error.message);
    } else {
        // Például hálózati hiba vagy feldolgozhatatlan válasz.
        alert("Nem sikerült feldolgozni a kérést. Próbáld újra!");
    }

    console.error(error);
}

// Az űrlap feladata: kiolvasni és elküldeni az adatokat.
urlap.addEventListener("submit", async (event) => {
    event.preventDefault();

    const felhasznalonev = urlap.querySelector("#username").value;
    const jelszo = urlap.querySelector("#password").value;

    await apiRequest({
        url: "backend/public/login.php",
        method: "POST",
        data: {
            username: felhasznalonev,
            password: jelszo
        },
        onSuccess: sikeresBejelentkezes,
        onError: sikertelenBejelentkezes
    });
});