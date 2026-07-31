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

So `config.js` is gitignored here, but for tidiness rather than safety — it keeps
your project name and your user IDs off a public repo. Don't mistake it for the
thing keeping you safe. **If the rules aren't right, nothing else matters.**

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

### 3. Put it online

Either is fine. Netlify is quicker if you'd rather not install anything.

**Netlify Drop** — go to `app.netlify.com/drop` and drag the whole project
folder onto the page. You get a URL in about ten seconds. To update it later,
drag the folder again.

**Firebase Hosting** — needs Node installed:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory: . (a dot) — single-page app: No
firebase deploy
```

Whichever you choose, go back to **Authentication → Settings → Authorised
domains** in Firebase and add the domain you were given. Sign-in fails without
this.

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

---

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Meal Planner"
git branch -M main
git remote add origin git@github.com:you/meal-planner.git
git push -u origin main
```

`.gitignore` already excludes `config.js`, so your project details and user IDs
stay off GitHub while `config.example.js` shows the shape of what's needed.

One thing to watch: if you commit `config.js` by accident, removing it in a
later commit does **not** remove it from history. Rotating a Firebase config is
awkward, so it's worth checking `git status` before that first push. Run
`git check-ignore -v config.js` to confirm it's being skipped.

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
3. **Pull the ingredients from a URL automatically.** Most recipe sites publish
   machine-readable data in the page, so this works more often than you'd
   expect — but it needs a small server-side function, because browsers block
   reading other sites directly.
4. **Photos**, using Firebase Storage.
5. **Lunches**, if dinners-only starts to chafe.
