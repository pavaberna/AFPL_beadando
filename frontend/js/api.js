async function apiRequest({
    url,
    method = "GET",
    data,
    credentials = "same-origin",
    cache = "default",
    onSuccess,
    onError
}) {
    try {
        const options = {
            method: method.toUpperCase(),
            credentials,
            cache,
            headers: {
                "Accept": "application/json"
            }
        };

        if (data !== undefined) {
            if (options.method === "GET" || options.method === "HEAD") {
                throw new Error("GET és HEAD kéréshez nem küldhető törzs.");
            }

            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
      
        // A backend hibaválasza is tartalmazhat hasznos JSON-adatot.
        const text = await response.text();
        const result = text.trim() ? JSON.parse(text) : null;

        if (!response.ok) {
            const error = new Error(
                result?.error || "Sikertelen kérés."
            );

            error.status = response.status;
            throw error;
        }

        if (onSuccess) {
            await onSuccess(result);
        }

        return result;
    } catch (error) {
        if (onError) {
            await onError(error);
        } else {
            throw error;
        }
    }
}