/**
 * Stocare persistentă doar în Firestore (users/{uid}).
 * Nu folosește localStorage pentru datele aplicației.
 * sessionStorage: doar onboarding (înainte de login) și handoff imagine upload→result.
 */
(function (global) {
  var AppData = { progress: {}, macros: {}, settings: {} };

  function clearAppData() {
    AppData.progress = {};
    AppData.macros = {};
    AppData.settings = {};
  }

  function parseLog(raw) {
    if (raw == null) return [];
    try {
      if (typeof raw === 'string') return JSON.parse(raw);
      if (Array.isArray(raw)) return raw;
    } catch (e) {}
    return [];
  }

  function getLogDay(dayKey) {
    return parseLog(AppData.progress[dayKey]);
  }

  function setLogDay(dayKey, arr) {
    AppData.progress[dayKey] = JSON.stringify(arr);
  }

  global.AppDataStore = {
    data: AppData,
    clear: clearAppData,

    getLogDay: getLogDay,
    setLogDay: setLogDay,

    loadFromFirestore: function (uid) {
      if (!uid || !global.firebase) return Promise.resolve();
      return global.firebase
        .firestore()
        .collection('users')
        .doc(uid)
        .get()
        .then(function (doc) {
          clearAppData();
          if (!doc.exists) return;
          var d = doc.data();
          if (d.progress && typeof d.progress === 'object') AppData.progress = Object.assign({}, d.progress);
          if (d.macros && typeof d.macros === 'object') AppData.macros = Object.assign({}, d.macros);
          if (d.settings && typeof d.settings === 'object') AppData.settings = Object.assign({}, d.settings);
        })
        .catch(function (err) {
          console.error('[AppDataStore] Firestore read failed:', err && err.code, err && err.message);
        });
    },

    saveToFirestore: function (uid) {
      if (!uid || !global.firebase) return Promise.resolve();
      var db = global.firebase.firestore();
      var ref = db.collection('users').doc(uid);
      return ref
        .get()
        .then(function (doc) {
          var d = doc.exists && doc.data ? doc.data() : {};
          var existingProgress = (d.progress && typeof d.progress === 'object') ? d.progress : {};
          var existingMacros = (d.macros && typeof d.macros === 'object') ? d.macros : {};
          var existingSettings = (d.settings && typeof d.settings === 'object') ? d.settings : {};
          var mergedProgress = Object.assign({}, existingProgress, AppData.progress || {});
          var mergedMacros = Object.assign({}, existingMacros, AppData.macros || {});
          var mergedSettings = Object.assign({}, existingSettings, AppData.settings || {});
          AppData.progress = Object.assign({}, mergedProgress);
          AppData.macros = Object.assign({}, mergedMacros);
          AppData.settings = Object.assign({}, mergedSettings);
          return ref.set(
            {
              progress: mergedProgress,
              macros: mergedMacros,
              settings: mergedSettings,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        })
        .catch(function (err) {
          console.error('[AppDataStore] Firestore save failed:', err && err.code, err && err.message);
        });
    },

    /** După onboarding (sessionStorage), la primul login pe home. */
    mergeOnboardingFromSession: function () {
      var raw = global.sessionStorage && global.sessionStorage.getItem('onb_custom_macros');
      if (!raw) return false;
      try {
        var c = JSON.parse(raw);
        if (!c || !c.calories) return false;
        AppData.macros = Object.assign({}, AppData.macros || {}, {
          calories: c.calories,
          protein: c.protein,
          carbs: c.carbs,
          fat: c.fat,
        });
        AppData.settings = Object.assign({}, AppData.settings || {}, {
          calories_goal: String(c.calories),
          protein_goal: String(c.protein),
          carbs_goal: String(c.carbs),
          fat_goal: String(c.fat),
        });
        return true;
      } catch (e) {
        return false;
      }
    },

    clearOnboardingSession: function () {
      if (!global.sessionStorage) return;
      ['onb_custom_macros', 'user_height', 'user_weight', 'user_goal', 'user_gender', 'user_workout_frequency', 'user_birthdate'].forEach(function (k) {
        try {
          global.sessionStorage.removeItem(k);
        } catch (e) {}
      });
    },

    /**
     * Citește documentul, adaugă log pe zi, actualizează streak; scrie în Firestore.
     * Folosit din result.html (fără AppData în memorie).
     */
    appendLogEntryRemote: function (uid, dayKey, logDateStr, entry) {
      if (!uid || !global.firebase) return Promise.resolve();
      var db = global.firebase.firestore();
      var ref = db.collection('users').doc(uid);
      return ref
        .get()
        .then(function (doc) {
          var progress = {};
          var macros = {};
          var settings = {};
          if (doc.exists) {
            var d = doc.data();
            progress = (d.progress && typeof d.progress === 'object') ? Object.assign({}, d.progress) : {};
            macros = (d.macros && typeof d.macros === 'object') ? Object.assign({}, d.macros) : {};
            settings = (d.settings && typeof d.settings === 'object') ? Object.assign({}, d.settings) : {};
          }
          var logs = parseLog(progress[dayKey]);
          var firstScanThatDay = logs.length === 0;
          logs.unshift(entry);
          progress[dayKey] = JSON.stringify(logs);

          if (firstScanThatDay) {
            var dateObj = new Date(logDateStr);
            var todayKey = dateObj.toDateString();
            var yesterday = new Date(dateObj);
            yesterday.setDate(yesterday.getDate() - 1);
            var yesterdayKey = yesterday.toDateString();
            var streak = parseInt(settings.streak || '0', 10);
            if (!Number.isFinite(streak) || streak < 0) streak = 0;
            var lastLogDate = settings.last_log_date || '';
            if (lastLogDate !== todayKey) {
              if (lastLogDate === yesterdayKey) streak = streak + 1;
              else streak = 1;
              settings.streak = String(streak);
              settings.last_log_date = todayKey;
            }
          }

          return ref.set(
            {
              progress: progress,
              macros: macros,
              settings: settings,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        })
        .catch(function (err) {
          console.error('[AppDataStore] appendLogEntryRemote failed:', err && err.code, err && err.message);
        });
    },
  };
})(typeof window !== 'undefined' ? window : this);
