# Storage Access Headers Case

## Steps to Reproduce

1. Create keys and certificate for HTTPS. In this folder, run the following commands (requires openssl)
  1. `openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365`
  2. `openssl rsa -in keytmp.pem -out key.pem`
2. Run `npm install` to install dependencies (`express`, `cookie-parser`).
3. Run `npm start` to start the app at [http://localhost:3000](http://localhost:3000).
4. Open `iframe.html` and follow the instructions, or follow these steps manually:
  1. Visit [http://localhost:3000/cookie](http://localhost:3000/cookie) to set a cookie with a name and value of your choice. If you visit [http://localhost:3000](http://localhost:3000) (outside of an iframe), you should see the cookie you just created.
  2. Open [http://localhost:3000?embed](http://localhost:3000?embed) in an iframe (make sure to include the `embed` query parameter).
  3. When prompted to grant storage access, grant access.
  4. As with the non-iframe version, you should now see the cookie you created (assuming storage access was granted in step 3).
