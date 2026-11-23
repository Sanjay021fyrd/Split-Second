# ⚡ Split Second

A fast reaction-time game that runs in the browser: no install, no dependencies, just HTML, CSS and JavaScript. Wait for the signal, then hit it as fast as you can. The game rules are simple on purpose; the design, animation and feel are the point.

**Built with:** HTML · CSS · vanilla JavaScript · Canvas · SVG · Web Audio API · Service Worker (installable PWA)

## Game modes

| Mode | How it works |
| --- | --- |
| **Classic** | 5 rounds. Click, tap or press Space when the screen turns green. |
| **Lights Out** | An F1-style race start. Five red lights come on one by one, hold for a random time, then all go out. That's your GO. Moving early is a "JUMP START". |
| **Go / No-Go** | Like Classic, but a purple **HOLD!** decoy sometimes appears. Click it and it counts as a false start. |
| **2-Player Duel** | One screen, two players. Player 1 uses **Q** (or taps the left half), Player 2 uses **P** (or taps the right half). First to 3 round wins. |

## Design and animation

- **Hit impact:** a 110 ms hit-stop freeze, a shockwave ripple from the exact spot you clicked, a flash, a camera punch, speed lines for very fast times, and the millisecond number slamming onto the screen in your tier's colour.
- **Animated results:** a count-up score, a rank letter that stamps onto the screen, a speed gauge with a swinging needle, and a bell curve where your dot drops in to show how you compare.
- **Share card:** generates a 1080×1080 image of your result (canvas) to save or share.
- **3 themes** (unlocked with XP): **Neon Arcade**, **Samurai** (falling petals, sword-slash impacts, "DRAW!") and **Deep Space** (a starfield that warps when the signal fires, "LAUNCH!"). Each has its own colours, type and ambient background.
- **XP and levels:** earn XP from every round, level up to unlock themes, with an animated level-up banner.
- **Micro-interactions:** 3D tilt cards with a pointer-following sheen, a cursor glow in the game area, magnetic buttons, click ripples, a sliding mode selector, rolling HUD numbers, a spinning gradient border and a staggered page-load entrance.
- Everything respects `prefers-reduced-motion`.

## Fair and accurate

- The clock starts when the green frame is actually drawn (`requestAnimationFrame`), and your press is timed with `pointerdown` / the event timestamp, so input lag is not counted against you.
- The hit-stop and slam only change what is *shown*; your time is recorded first.
- The waiting animation runs at a constant rhythm, so it never hints when the signal is coming.
- False starts replay the round. Reactions under 100 ms count as guesses, not reactions.
- Your best times, XP, theme and recent runs are saved locally (`localStorage`, with a safe fallback if storage is blocked).

## Accessibility

Keyboard playable, visible focus, text and icon cues (not just colour), screen-reader announcements for results, and reduced-motion support.

## Run it

Open `index.html` in a browser. The offline / install features need it served over `http://localhost` or HTTPS, for example:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

It also works on GitHub Pages: Settings → Pages → deploy from the `main` branch.

## Project structure

```
index.html            page structure
style.css             themes, layout and animations
script.js             game logic (state machine, modes, scoring, XP, themes, sound)
fx.js                 effects: hit impact, ambient canvas background, micro-interactions
viz.js                results: gauge, bell curve, rank stamp, share-card image
sw.js                 service worker (offline support)
manifest.webmanifest  PWA manifest
icon.svg              app icon
```

