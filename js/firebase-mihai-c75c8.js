/**
 * Init Firebase (compat). Config: mai întâi window.__CALORIE_FIREBASE_CONFIG (din HTML),
 * apoi fallback încorporat — rupe cache-ul pe fișierul vechi logare-d7168.
 */
(function () {
  if (typeof firebase === 'undefined') {
    console.error('[firebase] Încarcă mai întâi scripturile firebase-app / auth / firestore.');
    return;
  }

  var embedded = {
    apiKey: 'AIzaSyDqpWiWr_uEcB6zzl--nEYbltSbZ8F5WE8',
    authDomain: 'mihai-c75c8.firebaseapp.com',
    projectId: 'mihai-c75c8',
    storageBucket: 'mihai-c75c8.firebasestorage.app',
    messagingSenderId: '662997093975',
    appId: '1:662997093975:web:d7437cc362a2ec7d13dd12',
    measurementId: 'G-T8E3Q20SP8',
  };

  var firebaseConfig =
    (typeof window !== 'undefined' && window.__CALORIE_FIREBASE_CONFIG) || embedded;

  try {
    console.info('[Calorie app] Firebase projectId:', firebaseConfig.projectId);
  } catch (e) {}

  function needsSetup() {
    var v = firebaseConfig.apiKey || '';
    return !v || v.indexOf('REPLACE') !== -1;
  }

  if (needsSetup()) {
    console.error('[firebase] Lipsește config (REPLACE_*).');
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

    console.warn('[firebase] Alt proiect în memorie (' + pid + '). Trec la ' + firebaseConfig.projectId + '.');
    existing.delete().then(function () {
      firebase.initializeApp(firebaseConfig);
      finish();
    });
  } catch (e) {
    console.error('[firebase] initializeApp:', e);
  }
})();
