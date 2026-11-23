# ⏱️ Split Second

A fast reaction-time game that runs in the browser. No install, no dependencies, just HTML, CSS and JavaScript. Wait for the signal, then hit it as fast as you can.

The rules are simple on purpose. The design, animation and feel are the point.

**🎮 Live demo:** [https://sanjay021fyrd.github.io/Split-Second/](https://sanjay021fyrd.github.io/Split-Second/)

![Split Second gameplay](screenshots/gameplay.gif)

> *Add a GIF of a Lights Out round and a screenshot of the results screen here.*

**Built with:** HTML · CSS · Vanilla JavaScript · Canvas · SVG · Web Audio API · Service Worker (installable PWA)

---

## 🎯 Why I Built This

I wanted to explore how accurately a reaction time can be measured in the browser, and how much game feel (impact, motion, sound) can be added without any framework or library.

---

## 🕹️ Game Modes

| Mode | How it works |
|------|--------------|
| **Classic** | 5 rounds. Click, tap or press Space when the screen turns green. |
| **Lights Out** | An F1-style race start. Five red lights come on one by one, hold for a random time, then all go out. That's your GO. Moving early is a "JUMP START". |
| **Go / No-Go** | Like Classic, but a purple **HOLD!** decoy sometimes appears. Click it and it counts as a false start. |
| **2-Player Duel** | One screen, two players. Player 1 uses **Q** (or taps the left half), Player 2 uses **P** (or taps the right half). First to 3 round wins. |

---

## ✨ Design and Animation

- **Hit impact:** a 110 ms hit-stop freeze, a shockwave ripple from the exact spot you clicked, a flash, a camera punch, speed lines for very fast times, and the millisecond number slamming onto the screen in your tier's colour.
- **Animated results:** a count-up score, a rank letter that stamps onto the screen, a speed gauge with a swinging needle, and a bell curve where your dot drops in to show how you compare.
- **Share card:** generates a 1080×1080 image of your result (canvas) to save or share.
- **3 themes (unlocked with XP):**
  - **Neon Arcade**
  - **Samurai:** falling petals, sword-slash impacts, "DRAW!"
  - **Deep Space:** a starfield that warps when the signal fires, "LAUNCH!"

  Each has its own colours, type and ambient background.
- **XP and levels:** earn XP from every round and level up to unlock themes, with an animated level-up banner.
- **Micro-interactions:** 3D tilt cards with a pointer-following sheen, cursor glow, magnetic buttons, click ripples, a sliding mode selector, rolling HUD numbers, a spinning gradient border and a staggered page-load entrance.

Everything respects `prefers-reduced-motion`.

---

## ⚖️ Fair and Accurate

- The clock starts when the green frame is actually drawn (`requestAnimationFrame`), and your press is timed with `pointerdown` / the event timestamp, so input lag is not counted against you.
- The hit-stop and slam only change what is shown. Your time is recorded first.
- The waiting animation runs at a constant rhythm, so it never hints when the signal is coming.
- False starts replay the round. Reactions under 100 ms count as guesses, not reactions.
- Best times, XP, theme and recent runs are saved locally (`localStorage`, with a safe fallback if storage is blocked).

---

## ♿ Accessibility

Keyboard playable, visible focus, text and icon cues (not just colour), screen-reader announcements for results, and reduced-motion support.

---

## ▶️ Run It

**Quick way:** download or clone the project and open `index.html` in a browser.

**Full experience (offline and install features):** these need the game to be served over `http://localhost` or HTTPS.

```bash
python -m http.server 8000
# on Mac/Linux you may need: python3 -m http.server 8000
```

Then open <http://localhost:8000>.

**Host it on GitHub Pages:** go to **Settings → Pages** and deploy from the `main` branch.

---

## 🗂️ Project Structure

```
Split-Second/
├── index.html            # page structure
├── style.css             # themes, layout and animations
├── script.js             # game logic (state machine, modes, scoring, XP, themes, sound)
├── fx.js                 # effects: hit impact, ambient canvas background, micro-interactions
├── viz.js                # results: gauge, bell curve, rank stamp, share-card image
├── sw.js                 # service worker (offline support)
├── manifest.webmanifest  # PWA manifest
└── icon.svg              # app icon
```


Created by T.M. Sanjay Kumar
[GitHub](https://github.com/sanjay021fyrd) · [LinkedIn](https://linkedin.com/in/your-profile)


MIT License
 
Copyright (c) 2026 T.M. Sanjay Kumar
 
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
 
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
