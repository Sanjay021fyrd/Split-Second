# ⚡ Split Second

A fast reaction-time game with a vanilla browser frontend and a dependency-free Node.js server. Wait for the signal, then hit it as fast as you can. The game rules are simple on purpose; the design, animation and feel are the point.

**Built with:** HTML, CSS, JavaScript, Canvas, SVG, Web Audio and Node.js.

Choose 3 or 5 rounds before starting. The default is 3. The theme and round count are fixed during the run and become available again at results or when you reset.

## Game modes

| Mode | How it works |
| --- | --- |
| **Classic** | Click, tap or press Space when the screen turns green. |
| **Lights Out** | An F1-style race start. Five red lights come on one by one, hold for a random time, then all go out. That's your GO. Moving early is a "JUMP START". |
| **Go / No-Go** | Like Classic, but a purple **HOLD!** decoy sometimes appears. Click it and it counts as a false start. |
| **2-Player Duel** | One screen, two players. Player 1 uses **Q** (or taps the left half), Player 2 uses **P** (or taps the right half). The player with more points after the selected rounds wins. Equal scores are a draw. |

## Design and animation

- **Hit impact:** a 110 ms hit-stop freeze, a shockwave ripple from the exact spot you clicked, a flash, a camera punch, speed lines for very fast times, and the millisecond number slamming onto the screen in your tier's colour.
- **Animated results:** a count-up score, a rank letter that stamps onto the screen, a speed gauge with a swinging needle, and a bell curve where your dot drops in to show how you compare.
- **Share card:** generates a 1080×1080 image of your result (canvas) to save or share.
- **Themes:** Avocado Grove, Samurai, Deep Space, GTA 6 Theme and Egyptian Theme are all immediately selectable after sign-in.
- **XP and levels:** earn XP from successful rounds and completed runs. Level-ups are independent of themes.
- **Micro-interactions:** 3D tilt cards, theme-colored button hover effects, click ripples, a sliding mode selector, rolling HUD numbers, a themed gradient border and a staggered page-load entrance.
- Everything respects `prefers-reduced-motion`.

## Fair and accurate

- The clock starts when the green frame is actually drawn (`requestAnimationFrame`), and your press is timed with `pointerdown` / the event timestamp, so input lag is not counted against you.
- The hit-stop and slam only change what is *shown*; your time is recorded first.
- An early press, decoy press, reaction under 100 ms, or 3-second timeout uses up the round. In Duel, false starts give the opponent a point and timeouts give neither player a point. Signals are silent. Reaction inputs play a hit or mistake sound.
- Your best times, XP, theme, round preference and recent runs are saved locally (`localStorage`, with a safe fallback if storage is blocked).

## Accessibility

Keyboard playable, visible focus, text and icon cues (not just colour), screen-reader announcements for results, and reduced-motion support.

## Run it with Google sign-in

1. Use Node.js 22 or later. In [Google Auth Platform](https://console.cloud.google.com/auth/overview), select or create a project. Set up **Branding** and **Audience**. For an external app in testing, add the Google accounts you plan to use under **Test users**.
2. Under **Clients**, create a **Web application** OAuth client. Add `http://localhost:3000/auth/google/callback` as an **Authorized redirect URI**. The redirect URI must match exactly. This flow does not require an Authorized JavaScript origin.
3. Open PowerShell inside the game folder, then run:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the OAuth client and save. Leave `APP_ORIGIN=http://localhost:3000` for local play. Keep `.env` private.
4. Start the server and open **http://localhost:3000**.

   ```powershell
   node --env-file=.env server.js
   ```

For deployment, run the Node server behind HTTPS, set `APP_ORIGIN` to the public origin, and register the matching HTTPS callback in Google. If the platform needs the server to accept traffic outside loopback, set `HOST=0.0.0.0`. A static host cannot handle the sign-in callback.

The server stores a minimal profile (Google account ID, name and email) in `.profiles/` using the stable Google account ID. For deployment, set `PROFILE_DIR` to a private persistent location. Google access tokens are used only to fetch a profile and are discarded. Sessions survive page refresh and expire after seven days or when the server restarts. Signing out invalidates the session immediately. XP and scores still live in this browser's local storage. The move from a local HTML file to HTTP changes the storage origin, so data from the local-file version does not migrate automatically.

## Project structure

- `index.html`, `style.css` and `auth.js` render the sign-in page and game.
- `script.js` contains game logic and the theme configuration. Add a theme by adding an entry to `THEMES`.
- `fx.js` and `viz.js` handle visual effects and results.
- `server.js` serves the game and manages Google authentication, profiles and sessions.
- `coastal.svg` and `ruins.svg` are original theme illustrations.
- `sw.js` retires the legacy offline cache so the game requires a live session.

## Manual test checklist

- [ ] Sign in with a Google test account. Check the name and email, refresh, and verify the session remains active. Log out and confirm the game is hidden.
- [ ] On a fresh browser profile, select each theme before playing. Confirm all five are available at level 1.
- [ ] Start a run. Both selectors should be disabled until the results appear or you select Reset to return to the start screen.
- [ ] Finish a 3-round and a 5-round run. Check the HUD count and results, including a false start or a missed round. In Duel, verify that the result uses the higher score and equal scores produce a draw.
- [ ] Earn XP and level up. Verify the theme stays selected and the options do not change.
- [ ] Cancel Google sign-in and check that the page displays a message and lets you try again.

## Practice and online competition

- Sign in with Google to access practice, regular play, leaderboards, and all online game modes. Practice is one Classic round.
- Weekly ranked runs use five Classic rounds. Daily challenges use three Classic rounds. The daily board resets at midnight UTC and the weekly board resets on Monday UTC. Wait times vary per run. Your best median within each period counts, provided every round is valid. The boards show the name from your Google profile and your score.
- The daily results screen can share or download a PNG result card.
- For a three-round online duel, create a room and send its code to a friend. Both players join the same server using separate sign-in sessions. The browser measures from its own visible GO signal, the server checks the response window, and reactions within 40 ms of each other are a draw. Browser-reported timing is suitable for casual competition, not cheat-proof scoring.
- Competition scores use the same persistent profile directory as Google account profiles. Use one Node instance and a persistent PROFILE_DIR. Active rooms and sign-in sessions are held in memory and end when the server restarts.

## Publish the game

Deploy the complete project as a Node web service. Use Node 22 or later and start it with 'node server.js'. Set HOST to 0.0.0.0 and APP_ORIGIN to the exact public HTTPS origin. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the host's private environment settings. Keep .env and .profiles out of your repository.

In Google Cloud, add the public callback at /auth/google/callback to the web OAuth client and enable the app for your intended audience. Open the public link in a private browser window. Check that practice and competition stay hidden until you sign in with another account, then try a duel from two devices.
