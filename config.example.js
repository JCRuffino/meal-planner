/* Copy this file to config.js and fill in your own values.
   Commit config.js: GitHub Pages serves only what is in the repo, so the app
   needs it there. The Firebase config is not a secret — see README. */

window.APP_CONFIG = {
  // From Firebase console > Project settings > Your apps > Web app
  firebase: {
    apiKey: "PASTE_YOURS",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:abcdef123456"
  },

  // The two of you. "key" is stored in the database, "name" is what you see.
  cooks: [
    { key: "joe",  name: "Joe"  },
    { key: "izzy", name: "Izzy" }
  ],

  // All data lives under /spaces/<spaceId>/ in Firestore.
  spaceId: "home",

  // Optional. The Cloudflare Worker URL from worker/recipe-fetcher.js, which
  // fills the form in from a recipe link. Leave it empty and the Fetch button
  // simply doesn't appear — pasting still works exactly as before.
  recipeFetcher: ""
};
