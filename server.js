import https from "https";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";

let __filename = fileURLToPath(import.meta.url);
let __dirname = dirname(__filename);

let app = express();
let port = 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(checkStorageAccessHeaders);

// Routes
app.get("/", handleHomePage);
app.get("/storage-access", handleStorageAccessPage);
app.get("/cookie", handleCookiePage);
app.post("/cookie", handleCookiePost);

let key = fs.readFileSync(join(__dirname, "key.pem"));
let cert = fs.readFileSync(join(__dirname, "cert.pem"));
let server = https.createServer({ key, cert }, app);

server.listen(port, () => {
  console.log(`HTTPS server running at https://localhost:${port}`);
});

// Handlers
function checkStorageAccessHeaders(req, res, next) {
  let url = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
  let storageAccessHeader = req.get("sec-fetch-storage-access");

  console.log("Storage Access Header Value", storageAccessHeader);

  if (!url.searchParams.has("embed") || url.pathname === "/storage-access") {
    return next();
  }

  if (storageAccessHeader === "inactive") {
    let origin = req.get("origin");
    return res
      .status(401)
      .set(
        "Activate-Storage-Access",
        `retry; allowed-origin="${origin || "*"}"`
      )
      .end();
  }

  if (storageAccessHeader === "active") {
    res.set("Activate-Storage-Access", "load");
    return next();
  }

  return res.redirect(
    `/storage-access?redirect=${encodeURIComponent(url.toString())}&embed`
  );
}

function handleHomePage(req, res) {
  let isIframeScript = `
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        let isIframe = window.self !== window.top;

        let h2 = document.createElement("h2");
        h2.textContent = isIframe
          ? "This page is loaded in an iframe"
          : "This page is not loaded in an iframe";

        let p = document.createElement("p");
        p.innerHTML = isIframe
          ? 'Please open <a href="/cookie" target="_blank">this link</a> in a new tab to set a cookie. Then go back to this page and check the cookies.'
          : 'Please visit <a href="/cookie">this link</a> to set a cookie.';

        document.body.prepend(p);
        document.body.prepend(h2);
      });
    </script>
  `;

  res.send(`
    <html>
      <body>
        ${isIframeScript}
        <h2>Cookies</h2>
        <pre>${JSON.stringify(req.cookies || {}, null, 2)}</pre>
      </body>
    </html>
  `);
}

function handleStorageAccessPage(req, res) {
  let redirectParam = req.query.redirect;
  try {
    let redirectURL = new URL(
      String(redirectParam),
      `${req.protocol}://${req.headers.host}`
    );
    if (redirectURL.origin !== `${req.protocol}://${req.headers.host}`) {
      return res.status(400).send("Invalid redirect URL");
    }
    if (req.query.embed == undefined) {
      return res.redirect(redirectURL.toString());
    }

    return res.send(`
      <html>
        <body>
          <script>
            async function checkAndRequestAccess() {
              if (!document.hasStorageAccess) {
                document.getElementById("grant").style.display = "none";
                document.getElementById("continue").style.display = "block";
                return;
              }

              let hasAccess = await document.hasStorageAccess();
              if (hasAccess) {
                window.location.href = "${redirectURL.toString()}";
                return;
              }

              document.getElementById("grant").style.display = "block";
              document.getElementById("continue").style.display = "none";
            }

            async function grantAccess() {
              try {
                await document.requestStorageAccess();
                window.location.href = "${redirectURL.toString()}";
              } catch {
                alert("Failed to gain access");
              }
            }

            window.onload = checkAndRequestAccess;
          </script>
          <p id="grant" style="display:none;">
            Click the button to grant storage access.
            <button onclick="grantAccess()">Grant Access</button>
          </p>
          <p id="continue" style="display:none;">
            Click to continue.
            <button onclick="window.location.href='${redirectURL.toString()}'">Continue</button>
          </p>
        </body>
      </html>
    `);
  } catch {
    return res.status(400).send("Malformed redirect URL");
  }
}

function handleCookiePage(req, res) {
  res.send(`
    <html>
      <body>
        <form method="post" action="/cookie">
          <label>
            Name:
            <input name="name" />
          </label>
          <br/>
          <label>
            Value:
            <input name="value" />
          </label>
          <br/>
          <button type="submit">Set Cookie</button>
        </form>
      </body>
    </html>
  `);
}

function handleCookiePost(req, res) {
  let name = req.body.name;
  let value = req.body.value;
  if (typeof name !== "string" || typeof value !== "string") {
    return res.status(400).send("Invalid input");
  }

  res.setHeader(
    "Set-Cookie",
    `${name.replace(/=/g, "-")}=${value.replace(
      /=/g,
      "-"
    )}; Path=/; SameSite=None; Secure; HttpOnly`
  );
  return res.redirect("/");
}
