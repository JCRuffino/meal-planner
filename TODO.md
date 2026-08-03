# Outstanding

Things that need a browser session as the account owner, so they can't be done
from the code side. Roughly most important first.

## 1. Add Izzy to the security rules

Until this is done she can't use the app at all, and none of the two-person
behaviour — live sync, shared lists — can be tested. This is the only item that
actually blocks the app being finished.

- [ ] Izzy opens https://jcruffino.github.io/meal-planner/ and signs in
- [ ] She gets "This account is not on the list yet" with her user ID — copy it
- [ ] Paste both IDs into **Firestore Database → Rules** in the Firebase console
      and press **Publish**
- [ ] Both reload and confirm you each see the same recipes

Rules to publish are in [firestore.rules](firestore.rules), with the two
placeholders swapped for the real IDs. A malformed list won't publish, but a
well-formed *wrong* ID publishes happily and silently locks that person out — so
if she still sees the gate afterwards, compare the ID on screen character by
character.

Optional: send both IDs over and they'll be committed to `firestore.rules` so the
repo matches what's actually published. Firebase never reads that file from
GitHub, so publishing in the console is still required either way.

## 2. Re-paste the worker so the screenshot reader works

The worker code changed after the last paste — it now tries several vision models
in turn instead of one. Everything else about it is working.

- [ ] Cloudflare dashboard → the `recipte-fetcher` worker → **Edit code**
- [ ] Select all, delete, paste in [worker/recipe-fetcher.js](worker/recipe-fetcher.js)
- [ ] **Deploy**

The `AI` binding is already in place — confirmed, because the last attempt reached
the model and got a model-level error rather than a missing-binding one. Nothing
to do there.

Once deployed, the Paprika Chicken screenshot can be fired at it to confirm what
comes back.

Optional, only if Moondream turns out to be poor at reading screenshots: accept
Meta's Llama licence in the Cloudflare dashboard and the worker will start using
`llama-3.2-11b-vision-instruct` automatically, no code change. The licence asks
you to confirm you're not domiciled in the EU; the UK hasn't been since 2020.

## 3. Install it to the home screen

- [ ] **iPhone:** open the URL in Safari (must be Safari) → Share → *Add to Home Screen*
- [ ] **Android:** open in Chrome → ⋮ menu → *Install app*
- [ ] Sign in once inside the installed app — the Safari session doesn't carry over,
      which is expected rather than the bug below

## 4. Pin down the sign-in problem

Two questions that decide what the fix is. Both currently unanswered.

- [ ] Were the repeated sign-ins happening in a **browser tab** or the **installed
      app**?
- [ ] Roughly how long between them — every reload, or every few days?

Every reload points at persistence, which has had one fix applied already. Every
few days points at iOS clearing storage for sites untouched for a week, which
needs a different approach.

If it turns out to be the installed app on iOS, the cause is almost certainly
`signInWithPopup` throwing the Google sign-in out to Safari, where it succeeds
without the installed app ever receiving the session. The fix is to detect
standalone mode and use the redirect flow there instead.

Worth checking on whichever device it happens on: F12 → Application → Local
Storage and IndexedDB, looking for a `firebase:authUser:…` entry. If it's present
while the app still shows the sign-in screen, the problem is reading it back
rather than storing it — a different fix again.

## 5. Acceptance checks

All of these were verified by reading the code. None have been run against the
real database.

Single device:

- [ ] A recipe with cost 6.50 across 4 servings shows £1.63 a serving
- [ ] Every sort option actually reorders the list
- [ ] "Not had in a while" puts never-cooked recipes first
- [ ] Search finds a recipe by an ingredient that isn't in its name
- [ ] The rail always shows exactly ten days, starting today
- [ ] Making a shopping list turns each ingredient line into one tickable item
- [ ] A place added to a past day sets its last-visited date and drops off the rail

That last one is the auto-logging, and it's the only behaviour that can lose data
if it's wrong. Worth testing deliberately: plan something for yesterday, reload,
and check the date landed on the recipe or place.

Two devices or two browser profiles:

- [ ] Ticking a shopping item on one phone shows as ticked on the other without a
      reload
- [ ] Both accounts see identical data
- [ ] A third Google account sees nothing

## Known and unfixed

- **Two people ticking the same shopping item at the same moment** — each tick
  rewrites the whole list document from local state, so a simultaneous tick can be
  lost. Needs a transaction. Left alone deliberately; it only bites if you're both
  in the shop at once.
- **Offline doesn't work.** The service worker gives a fast, installable shell but
  `config.js` is deliberately never cached, and Firestore persistence isn't
  enabled, so the app needs a connection.
