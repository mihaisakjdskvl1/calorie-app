/**
 * Dacă vezi în consolă alt projectId (ex. logare-d7168), e cache vechi:
 * hard refresh (Cmd+Shift+R) sau Șterge datele site-ului pentru acest domeniu.
 *
 * Firebase Console: Google sign-in, Firestore + reguli, Authorized domains.
 */
(function () {
  if (typeof firebase === 'undefined') {
    console.error('[firebase-config] Încarcă mai întâi scripturile firebase-app / auth / firestore.');
    return;
  }

  var firebaseConfig = {
    apiKey: 'AIzaSyDqpWiWr_uEcB6zzl--nEYbltSbZ8F5WE8',
    authDomain: 'mihai-c75c8.firebaseapp.com',
    projectId: 'mihai-c75c8',
    storageBucket: 'mihai-c75c8.firebasestorage.app',
    messagingSenderId: '662997093975',
    appId: '1:662997093975:web:d7437cc362a2ec7d13dd12',
    measurementId: 'G-T8E3Q20SP8',
  };

  function needsSetup() {
    var v = firebaseConfig.apiKey || '';
    return !v || v.indexOf('REPLACE') !== -1;
  }

  if (needsSetup()) {
    console.error(
      '[firebase-config] Deschide js/firebase-config.js și înlocuiește valorile cu cele din Firebase → Project settings → Web app.'
    );
    return;
  }

  function finish() {
    try {
      if (typeof firebase.analytics === 'function') {
        try {
          firebase.analytics();
        } catch (a) {}
      }
    } catch (e) {}
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      finish();
      return;
    }

    var existing = firebase.app();
    var pid = existing.options && existing.options.projectId;
    if (pid === firebaseConfig.projectId) {
      finish();
      return;
    }

    console.warn(
      '[firebase-config] Proiect Firebase vechi în memorie (' +
        pid +
        '). Trec la ' +
        firebaseConfig.projectId +
        '.'
    );
    existing.delete().then(function () {
      firebase.initializeApp(firebaseConfig);
      finish();
    });
  } catch (e) {
    console.error('[firebase-config] initializeApp:', e);
  }
})();
