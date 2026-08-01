/* Runtime config for the Meal Planner app. */
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCV6CRkVg7mPLbGVw4oTivh0S1AAizK9vU",
    authDomain: "meal-planner-e384e.firebaseapp.com",
    projectId: "meal-planner-e384e",
    storageBucket: "meal-planner-e384e.firebasestorage.app",
    messagingSenderId: "141639215943",
    appId: "1:141639215943:web:da0bcb83e477fa69397a62"
  },

  cooks: [
    { key: "joe", name: "Joe" },
    { key: "izzy", name: "Izzy" }
  ],

  spaceId: "home",

  // Paste the Cloudflare Worker URL here once deployed (see README).
  // Empty means the Fetch button stays hidden.
  recipeFetcher: ""
};
