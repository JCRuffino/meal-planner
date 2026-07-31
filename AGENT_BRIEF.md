# Agent brief — Meal Planner

You are setting up a small web app for a two-person household. Work through this
top to bottom. It is self-contained: everything you need to know is here.

---

## 0. Before anything else

Check whether `meal-planner.zip` or a `meal-planner/` folder already exists in
the working directory.

- **It exists** → the app is already written. Take **Path A**. Do not rewrite it.
- **It doesn't** → take **Path B** and build from the spec below.

Then, either way, do sections 6 onwards.

---

## 1. What this is

A private dinner planner shared by two people, Joe and Izzy. Three jobs:

1. **A recipe library** they can sort by cost per serving, healthiness, cook time
   and how long since they last ate it.
2. **A ten-day dinner plan.** Dinners only. Always today plus nine.
3. **A shopping list** built from one recipe at a time, tickable in the shop.

It runs on both their phones as an installed app, and changes made by one appear
for the other within a second or two.

## 2. Constraints — these were decided deliberately, don't revisit them

| Constraint | Why |
| --- | --- |
| Vanilla HTML/CSS/JS in a single `index.html` | The owner wants minimal setup. No React, no npm, no bundler, no TypeScript. |
| Firebase from the gstatic CDN via ES modules | Avoids a build step entirely. |
| Firestore for storage, Google sign-in for auth | Chosen over a secret link after discussion. |
| Two hardcoded user IDs in the security rules | Only these two accounts get access. |
| One recipe per shopping list — **no merging** | Explicitly deferred. Do not build multi-recipe consolidation. |
| Dinners only — no breakfast or lunch | Explicitly scoped. |
| Cost is typed by hand as a whole-recipe total | No price lookup API. Per-serving is derived. |
| Healthiness is a self-rated 1–5 | No nutrition API, no calorie calculation. |
| Ingredients are pasted as text | No URL scraping. The URL is stored as a link only. |

If you think one of these is wrong, say so in your summary at the end. Do not
unilaterally change it.

---

## Path A — files already exist

1. Unzip if needed. Confirm this structure:

   ```
   meal-planner/
     index.html                 the entire app
     config.example.js          template for config.js
     config.js                  MUST NOT EXIST YET — created in step 6
     firestore.rules            security rules, has placeholder IDs
     manifest.webmanifest       PWA manifest
     sw.js                      service worker
     .gitignore                 must contain config.js
     README.md
     SETUP.md
     .vscode/extensions.json
     .vscode/settings.json
     icons/icon-192.png
     icons/icon-512.png
     icons/icon-maskable-512.png
     icons/apple-touch-icon.png
   ```

2. Anything missing, build it from the spec in Path B.
3. Sanity-check `index.html` parses: extract the `<script type="module">` block
   and run `node --check` on it.
4. Skip to section 6.

---

## Path B — build from scratch

### 3. Data model

All data sits under `spaces/{spaceId}/`, where `spaceId` comes from config and
defaults to `home`.

**`spaces/home/recipes/{autoId}`**

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | required, the only required field |
| `url` | string | link to the original recipe |
| `ingredients` | string | raw pasted text, one ingredient per line |
| `cost` | number \| null | whole recipe, in pounds |
| `servings` | number \| null | cost per serving is `cost / servings`, never stored |
| `cookTime` | number \| null | minutes |
| `diet` | `"meat"` \| `"vegetarian"` \| `"vegan"` \| null | |
| `favs` | string[] | cook keys, e.g. `["joe"]` |
| `health` | 1–5 \| null | 5 is healthiest |
| `rMake` | 1–5 \| null | 5 is least faff |
| `rEat` | 1–5 \| null | 5 is most delicious |
| `rWash` | 1–5 \| null | 5 is least washing up |
| `lastCooked` | `"YYYY-MM-DD"` \| null | |
| `createdAt` | serverTimestamp | |

**`spaces/home/plan/{YYYY-MM-DD}`** — `{ recipeId: string }`. The date is the
document ID, so one dinner per day falls out for free.

**`spaces/home/meta/shopping`** — `{ recipeId, recipeName, items: [{ text, checked }] }`.
One list at a time. It lives in Firestore rather than on one device so ticks sync
between them mid-shop.

### 4. Screens

Bottom tab bar, four tabs, single column capped at 560px.

**Recipes** — filter chips (All / Joe's favourites / Izzy's favourites /
Vegetarian / Vegan / Meat), a search box matching name *and* ingredient text, and
a sort dropdown: cost per serving, healthiest, quickest, not had in a while, best
to eat, least washing up, name. Each row shows the name, its tags, and a data
strip: cost per serving, minutes, health, last cooked. Tapping opens an edit
sheet.

**Plan** — a vertical rail of ten days, today first, each with a marker dot on a
hairline spine. Today's dot is filled in the accent colour. Tapping a day opens a
recipe picker sorted least-recently-cooked first, since that's what you actually
want when deciding.

**Shop** — the current list as large tick targets with a "3 of 11 still to get"
counter, plus Clear. Empty state points at the recipes tab.

**Add** — the recipe form. Same form component as the edit sheet.

### 5. Behaviours that are easy to miss

- **Auto-logging.** On load, any plan document with a date earlier than today
  writes its date to that recipe's `lastCooked` (only if newer than what's
  there), then deletes itself. This keeps the rail at ten days and keeps the
  "not had in a while" sort honest with no manual logging. Guard it with a flag
  so it runs once per session.
- **Cooked today** button on each recipe, for meals cooked off-plan.
- **Ratings are inverted where it helps.** Washing up 5 = barely any, faff 5 =
  no faff. So every scale sorts the same direction: higher is better.
- **A deleted recipe still referenced by a plan day** must not crash the rail.
  Show "Recipe was deleted — tap to change".
- All three Firestore listeners are `onSnapshot`, not one-off reads. Live sync is
  the point.
- On `permission-denied`, show the signed-in user their own UID with a copy
  button. Without this the human cannot complete section 6.

### Design tokens

```
ink    #16211C    text
paper  #E9EDE7    page background
card   #FBFCF9    surfaces
moss   #2E4A3C    header, primary buttons, active state
ochre  #C8892A    accent — today's marker, favourite tags
brick  #A6402E    meat tag, destructive actions
leaf   #4C7A3F    vegan tag
muted  #6E8377    secondary text
line   #CDD6CC    borders
```

Type: **Bricolage Grotesque** for headings, **Public Sans** for body and UI,
**DM Mono** for all numbers, dates and labels — costs and times line up in
columns that way. Google Fonts, loaded in `<head>`.

Quality floor: 44px minimum tap targets, visible keyboard focus rings,
`prefers-reduced-motion` respected, safe-area insets handled for notched phones.

---

## 6. Human-only steps — stop and hand back

You cannot do these. They need a browser session as the account owner. When you
reach this point, stop and give the human this list.

1. **Firebase console** → create project, enable Firestore in production mode,
   enable Google under Authentication → Sign-in method.
2. Register a web app, copy the `firebaseConfig` object.
3. `cp config.example.js config.js` and paste it in, along with the two cooks'
   names. **You may create `config.js` if the human gives you the values.
   Never invent placeholder credentials and never commit it.**
4. Deploy — Netlify Drop (drag the folder) or `firebase deploy`. Then add the
   resulting domain under Authentication → Settings → Authorised domains.
5. Both people sign in once. Each is shown their user ID. Collect both.
6. Paste both IDs into `firestore.rules` and publish in the console.
7. Add to home screen: iOS Safari → Share → Add to Home Screen; Android Chrome →
   menu → Install app.

## 7. Things that will bite you

- **`file://` breaks Google sign-in.** Testing by double-clicking `index.html`
  will fail with an unhelpful error. Serve over `http://localhost` — VS Code's
  Live Server, or `python3 -m http.server`. Add `localhost` to the authorised
  domains list too.
- **The Firebase config is not a secret.** It ships in the page source of every
  Firebase web app by design. The security rules are what protect the data. Do
  not build obfuscation, proxies or environment-variable indirection to "hide"
  it — that is wasted effort. `config.js` is gitignored for tidiness only, and
  the human has already been told this.
- **Don't commit `config.js`.** Before any push, run `git check-ignore -v
  config.js` and confirm it prints a rule. Removing it in a later commit does
  not remove it from history.
- **Service worker caching.** It must skip cross-origin requests, or it will
  intercept Firebase traffic and break sync. It must also skip `config.js`, or
  stale credentials get served after an edit.
- **Firestore rules default to deny.** A blank-screen app after sign-in almost
  always means the rules weren't published or a UID has a typo.

## 8. Acceptance checks

Run through these before declaring it done. The last three need two devices or
two browser profiles.

- [ ] Signed out, the app shows only the sign-in screen.
- [ ] Signing in with an account not in the rules shows that account's UID and a
      copy button, not a blank page or a stack trace.
- [ ] Adding a recipe with only a name succeeds; blank name is refused.
- [ ] Cost 6.50 across 4 servings displays as £1.63 a serving.
- [ ] Every sort option reorders the list, and "not had in a while" puts
      never-cooked recipes first.
- [ ] Search finds a recipe by an ingredient that isn't in its title.
- [ ] The rail always shows exactly ten days, starting today.
- [ ] A plan entry dated yesterday sets that recipe's last-cooked date and
      vanishes from the rail on next load.
- [ ] Making a shopping list turns each ingredient line into one tickable item.
- [ ] Ticking an item on device A shows as ticked on device B without a reload.
- [ ] Both accounts see identical data; a third account sees nothing.
- [ ] Installs to the home screen and opens with no browser chrome.

## 9. Explicitly out of scope

Do not build these, however tempting. They are deliberately deferred and the
owner wants to live with version one first: merging multiple recipes into a
weekly shop, a pantry-staples filter, scraping ingredients from a URL, photo
uploads, lunches or breakfasts, nutrition data, price lookups, meal-plan
templates, or any kind of recommendation engine.

## 10. When you finish

Report: which path you took, any file you had to create, anything in section 8
you could not verify and why, and anything in section 2 you think is a mistake.
