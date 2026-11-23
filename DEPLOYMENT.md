# Publish the game

Deploy the complete project as a Node web service. Use Node 22 or later and start it with 'node server.js'. Set HOST to 0.0.0.0 and APP_ORIGIN to the exact public HTTPS origin. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the host's private environment settings. Keep .env and .profiles out of your repository.

In Google Cloud, add the public callback at /auth/google/callback to the web OAuth client and enable the app for your intended audience. Open the public link in a private browser window. Check that practice and competition stay hidden until you sign in with another account, then try a duel from two devices.

For deployment, run the Node server behind HTTPS, set `APP_ORIGIN` to the public origin, and register the matching HTTPS callback in Google. If the platform needs the server to accept traffic outside loopback, set `HOST=0.0.0.0`. A static host cannot handle the sign-in callback.

Competition scores use the same persistent profile directory as Google account profiles. Use one Node instance and a persistent PROFILE_DIR. Active rooms and sign-in sessions are held in memory and end when the server restarts.
