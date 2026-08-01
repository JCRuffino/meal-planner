# Meal Planner

A private dinner planner for two people. Recipes with cost, health and ratings;
a rolling ten-day dinner plan; and a tickable shopping list that syncs live
between both phones.

No build step, no framework, no npm. It is one HTML file plus a config file.

---

## First, a correction worth reading

**The Firebase config is not a secret.** Every web app that talks to Firebase
ships its config in the page source — the API key is a project identifier, not a
password. Anyone can read it out of your deployed site regardless of what you do
to your repo. Google says as much in their docs.

What actually protects your data is the security rules, which run on Google's
servers where nobody can touch them. That is why `firestore.rules` restricts
access to two specific user IDs. Even with your full config in hand, a stranger
gets nothing.

This is why `config.js` is **committed** to this repo rather than gitignored.
GitHub Pages serves only what has been committed, so the app needs it there to
work at all — and putting it there costs you nothing, because it was always
going to be readable in the deployed page anyway.

The same goes for the two user IDs in `firestore.rules`. A UID identifies an
account; it isn't a password and won't let anyone sign in as you.

**If the rules aren't right, nothing else matters.** That is the one step in this
README worth being careful about.

---

## Setup

### 1. Make the Firebase project

1. Go to the Firebase console and create a project. Turn Google Analytics off.
2. **Build → Firestore Database → Create database.** Pick a region near you and
   start in **production mode** (locked down — you'll add rules in step 4).
3. **Build → Authentication → Get started → Google → Enable.** Set a support
   email and save.
4. **Project settings (gear icon) → Your apps → Web (`</>`).** Give it a
   nickname, register, and copy the `firebaseConfig` object it shows you.

### 2. Add your config

```bash
cp config.example.js config.js
```

Open `config.js`, paste in your Firebase values, and set the two names under
`cooks`. The `key` values get stored in the database, so pick them once and
leave them alone; the `name` values are what you see in the app and can change
whenever.

Then commit it — see *Pushing to GitHub* below. This is the step people miss:
without `config.js` in the repo, the deployed app loads and tells you the config
is missing.

### 3. Put it online with GitHub Pages

Push the repo first, then on github.com go to **Settings → Pages** and set
**Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`. Give it a
minute or two and the site appears at:

```
https://<your-username>.github.io/<repo-name>/
```

Pages from a *private* repo needs a paid GitHub plan, so this route means a
public repo. The correction at the top of this README explains why that's safe.

Now go to **Authentication → Settings → Authorised domains** in Firebase and add
`<your-username>.github.io` — the bare domain, with no path and no repo name.
Sign-in fails without this.

**If you'd rather not make the repo public,** Netlify Drop is free and needs
nothing installed: go to `app.netlify.com/drop` and drag the whole project folder
onto the page. Because you're dragging the folder rather than deploying the repo,
`config.js` gets picked up whether or not it's committed, so the repo can stay
private. Add the Netlify domain to the authorised domains list instead. To update
the site later, drag the folder again.

**Firebase Hosting** also works, and needs Node installed:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory: . (a dot) — single-page app: No
firebase deploy
```

### 4. Lock down the rules

Open the app and sign in with Google. You'll be told your account isn't on the
list yet, and shown your user ID — copy it. Have your partner do the same on
their phone.

Now in the Firebase console go to **Firestore Database → Rules**, paste in the
contents of `firestore.rules` with both real IDs substituted, and press
**Publish**. Reload the app and you're in.

Test it properly: open the deployed URL in a private window while signed out,
or signed in as some other account. You should see nothing.

### 5. Put it on the home screen

- **iPhone** — open the URL in Safari (it must be Safari), tap Share, then
  *Add to Home Screen*.
- **Android** — open in Chrome, tap the three-dot menu, then *Install app* or
  *Add to Home screen*.

It then opens full screen with no browser chrome, like any other app.

### 6. Optional — filling the form in from a recipe link

Most recipe sites publish machine-readable `schema.org/Recipe` data in the page,
so the app can read the name, ingredients, method, servings and time straight off
a link. A browser can't fetch another site's HTML, so this needs one small thing
running server-side. `worker/recipe-fetcher.js` is that thing.

Cloudflare Workers is free for this — 100,000 requests a day, no card:

1. Sign up at `dash.cloudflare.com`, then **Workers & Pages → Create**.
2. Choose **Start with Hello World!** — not a template. The templates are all
   framework starters with build steps; this needs a bare worker.
3. Name it `recipe-fetcher`, pick JavaScript if asked, and **Deploy** the
   placeholder. It has to exist before you can edit it.
4. **Edit code**, select all, delete, paste in the whole of
   `worker/recipe-fetcher.js`, then **Deploy** again.
5. Copy the URL — `https://recipe-fetcher.<your-subdomain>.workers.dev`.
6. Put it in `config.js` as `recipeFetcher`, then commit and push.

To check it deployed, open `<your-worker-url>/?url=https://example.com` in a
browser. `{"error":"Not an allowed origin."}` is the *right* answer — a browser
tab sends no Origin header, so the lock refuses it and only the app gets through.
A Hello World greeting means the paste didn't save.

A **Fetch** button then appears beside the recipe link field. Until you set it,
the button stays hidden and everything works by pasting, as before.

The worker only answers requests from the origins listed at the top of the file.
If you deploy the app anywhere other than `jcruffino.github.io`, add that origin
to `ALLOWED_ORIGINS` — otherwise it's an open proxy for whoever finds the URL.

Two things to expect. Fetch only ever fills in *blank* fields, so it can't wipe
something you typed, and it never saves — you check it and press save yourself.
And it can't know your cost, healthiness or ratings, so those stay manual.

---

## Pushing to GitHub

The repo is already initialised with a commit, so you just need a remote:

```bash
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

Make the repo **public** when you create it, or Pages won't serve it on a free
plan. Then enable Pages as described in step 3.

After you've written `config.js`, commit it too — it's not gitignored, on purpose:

```bash
git add config.js
git commit -m "Add Firebase config"
git push
```

`git status` should come back clean afterwards. If `config.js` is missing from the
repo, the deployed app will load to a gate saying so.

Later on, if you ever change the Firebase project, remember that `config.js` is
in the git history like any other file. That's fine — it's not a credential — but
it does mean the old values stay visible in old commits.

---

## How it works

**Data** lives at `spaces/home/` in Firestore:

| Path | What's in it |
| --- | --- |
| `spaces/home/recipes/{id}` | one document per recipe |
| `spaces/home/plan/{YYYY-MM-DD}` | one document per planned dinner |
| `spaces/home/meta/shopping` | the current shopping list |

**The ten-day rail** always shows today plus nine. When a planned day passes,
that dinner is written to the recipe's *last cooked* date and the day drops off
by itself — so the sorting stays honest without either of you logging anything.
Cooked something unplanned? Open it and tap *Cooked today*.

**The shopping list** is one recipe at a time, as you asked. Ingredient lines
become tickable items, and because the list lives in Firestore rather than on
one phone, whoever is standing in the shop sees the other's ticks.

**Free tier.** Two people planning dinners will use a rounding error of the
Firestore free quota. There is no card on file unless you add one.

---

## Worth adding later, in rough order of usefulness

1. **Merge several recipes into one weekly shop** — the thing you already
   flagged. Needs ingredient quantities parsed and combined, which is the
   genuinely fiddly part.
2. **A pantry list** so olive oil and salt stop appearing on every list.
3. **Photos**, using Firebase Storage.
4. **Lunches**, if dinners-only starts to chafe.

*Pulling ingredients from a URL was on this list and is now built — see step 6.*
