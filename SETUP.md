# Getting this open in VS Code and up on GitHub

## VS Code

1. Download every file from the chat, keeping `icons/` and `.vscode/` as
   subfolders. Or unzip `meal-planner.zip` and skip this step.
2. In VS Code: **File → Open Folder** and choose the `meal-planner` folder.
3. VS Code will offer the recommended extensions — Live Server is the useful
   one. Accept it.
4. `cp config.example.js config.js` and fill it in (see README step 2).
5. Right-click `index.html` → **Open with Live Server**.

Live Server matters: opening `index.html` by double-clicking gives you a
`file://` URL, and Google sign-in refuses to run on those. Live Server serves it
over `http://localhost:5500`, which works. Add `localhost` to Firebase's
authorised domains list and you can develop without deploying.

## GitHub

**With the GitHub CLI** (`brew install gh` on Mac, `winget install GitHub.cli` on
Windows):

```bash
cd meal-planner
git init
git add .
git commit -m "Meal Planner"
gh auth login
gh repo create meal-planner --private --source=. --push
```

**Without it** — make an empty repo on github.com first, no README, then:

```bash
cd meal-planner
git init
git add .
git commit -m "Meal Planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

**Or entirely inside VS Code** — open the Source Control panel in the left
sidebar, click *Publish to GitHub*, sign in when prompted, and pick **private**.
No terminal needed.

## Before that first push

```bash
git status                        # config.js should NOT be listed
git check-ignore -v config.js     # should print the .gitignore rule
```

If `config.js` shows up in `git status`, stop and check `.gitignore` downloaded
properly. Untangling a file from git history afterwards is a real nuisance.

Make the repo **private** either way. Nothing in it is dangerous if the rules are
right, but there's no reason to publish your dinner habits.
