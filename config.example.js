/* Copy this file to config.js and fill in your own values.
   config.js is listed in .gitignore, so it never reaches GitHub. */

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
  spaceId: "home"
};
