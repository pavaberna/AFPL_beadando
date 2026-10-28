const urlap = document.querySelector("#bejelentkezes");

urlap.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Kiolvassuk az űrlap mezőinek aktuális tartalmát.
    const felhasznalonev = document.querySelector("#username").value;
    const jelszo = document.querySelector("#password").value;

    try {
        const response = await fetch("backend/public/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                username: felhasznalonev,
                password: jelszo
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Sikertelen bejelentkezés.");
            return;
        }

        if (data.user.role === "admin") {
            window.location.href = "admin.html";
        } else if (data.user.role === "teacher") {
            window.location.href = "tanar.html";
        }
    } catch (error) {
        alert("Nem sikerült feldolgozni a kérést. Próbáld újra!");
        console.error(error);
    }
});
