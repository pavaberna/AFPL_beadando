const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    // Itt keressük a frontend tesztjeit.
    testDir: "./frontend/tests/admin",
    testMatch: "**/*.spec.cjs",

    timeout: 30_000,

    expect: {
        timeout: 10_000
    },

    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),

    outputDir: "test-results-admin",

    reporter: [
        ["list"],
        ["html", {
            outputFolder: "playwright-report-admin",
            open: "never"
        }]
    ],

    use: {
        baseURL: "http://127.0.0.1:4173",
        browserName: "chromium",

        viewport: {
            width: 1280,
            height: 800
        },

        serviceWorkers: "block",
        screenshot: "only-on-failure",
        trace: "retain-on-failure"
    },

    // A teszt idejére elindítjuk a frontend webszerverét.
    webServer: {
        command:
            "node node_modules/http-server/bin/http-server frontend -p 4173 -a 127.0.0.1 -c-1 --silent",

        url: "http://127.0.0.1:4173/admin.html",
        reuseExistingServer: false,
        timeout: 30_000
    }
});