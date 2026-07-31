# Getting this open in VS Code and up on GitHub

## VS Code

1. Download every file from the chat, keeping `icons/` and `.vscode/` as
   subfolders. Or unzip `meal-planner.zip` and skip this step.
2. In VS Code: **File → Open Folder** and choose the project folder — the one
   with `index.html` directly inside it.
3. VS Code will offer the recommended extensions — Live Server is the useful
   one. Accept it.
4. `cp config.example.js config.js` and fill it in (see README step 2), then
   commit it. It is not gitignored, on purpose: GitHub Pages only serves what
   has been committed.
5. Right-click `index.html` → **Open with Live Server**.

Live Server matters: opening `index.html` by double-clicking gives you a
`file://` URL, and Google sign-in refuses to run on those. Live Server serves it
over `http://localhost:5500`, which works. Add `localhost` to Firebase's
authorised domains list and you can develop without deploying.

## GitHub

The repo is already initialised with commits on `main`, so this is just about
getting it onto github.com.

Make it **public**. GitHub Pages won't serve a private repo on a free plan, and
nothing in here is dangerous once the rules are published — see the correction at
the top of the README.

**With the GitHub CLI** (`brew install gh` on Mac, `winget install GitHub.cli` on
Windows):

```bash
gh auth login
gh repo create meal-planner --public --source=. --push
```

**Without it** — make an empty repo on github.com first, no README, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

**Or entirely inside VS Code** — open the Source Control panel in the left
sidebar, click *Publish to GitHub*, sign in when prompted, and pick **public**.
No terminal needed.

## Turning on Pages

In the repo on github.com: **Settings → Pages → Source: Deploy from a branch**,
branch `main`, folder `/ (root)`. Save, wait a minute or two, and the site is at
`https://<your-username>.github.io/meal-planner/`.

Then add `<your-username>.github.io` to Firebase under **Authentication →
Settings → Authorised domains**. The bare domain — no path, no repo name.

## Before that first push

```bash
git status        # should be clean
git ls-files      # config.js SHOULD be listed, once you've written it
```

`config.js` needs to be in the repo or the deployed app has no Firebase details
to connect with, and it will load to a gate telling you exactly that. This is the
opposite of the usual advice about config files, and it's deliberate: the Firebase
config is a project identifier rather than a password.

What must never be wrong is `firestore.rules`. Publish it with both real user IDs
before you consider this done.
