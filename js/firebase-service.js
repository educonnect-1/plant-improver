const FirestoreService = {

  async getUser(uid) {
    const snap = await db.collection('users').doc(uid).get();

    return snap.exists
      ? { id: snap.id, ...snap.data() }
      : null;
  },


  async getOrCreateUser(uid, email, name) {
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const data = {
        name: name || email.split('@')[0],
        email,
        role: 'admin',
        farmId: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await ref.set(data);

      return {
        id: uid,
        ...data
      };
    }

    await ref.set({
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      id: uid,
      ...snap.data()
    };
  },


  // ============================================================
  // FARM
  // ============================================================

  async getUserFarm(uid, farmId = null) {
    try {

      // 1. Try farmId stored in the user document
      if (farmId && String(farmId).trim() !== '') {

        const farmRef = db.collection('farms').doc(String(farmId));
        const farmSnap = await farmRef.get();

        if (farmSnap.exists) {
          console.log('Farm found using user.farmId:', farmSnap.id);

          return {
            id: farmSnap.id,
            ...farmSnap.data()
          };
        }

        console.warn(
          'user.farmId exists but farm document was not found:',
          farmId
        );
      }


      // 2. Fallback: find farm using ownerId
      const snap = await db
        .collection('farms')
        .where('ownerId', '==', uid)
        .limit(1)
        .get();

      if (!snap.empty) {

        const farmDoc = snap.docs[0];

        console.log(
          'Farm found using ownerId:',
          farmDoc.id
        );

        return {
          id: farmDoc.id,
          ...farmDoc.data()
        };
      }


      console.warn(
        'No farm found for user UID:',
        uid
      );

      return null;

    } catch (error) {

      console.error(
        'getUserFarm error:',
        error
      );

      throw error;
    }
  },


  // ============================================================
  // ZONES
  // ============================================================

  async getZones(farmId) {

    const snap = await db
      .collection('zones')
      .where('farmId', '==', farmId)
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  },


  async getZone(zoneId) {

    const snap = await db
      .collection('zones')
      .doc(zoneId)
      .get();

    return snap.exists
      ? {
          id: snap.id,
          ...snap.data()
        }
      : null;
  },


  // ============================================================
  // SENSOR READINGS
  // ============================================================

  async getLatestSensorReading(farmId, zoneId = null) {

    let q = db
      .collection('sensorReadings')
      .where('farmId', '==', farmId);

    if (zoneId) {
      q = q.where('zoneId', '==', zoneId);
    }

    const snap = await q
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      console.warn(
        'No sensor reading found for farm:',
        farmId
      );

      return null;
    }

    const d = snap.docs[0];

    return {
      id: d.id,
      ...d.data()
    };
  },


  subscribeToLatestSensorReading(
    farmId,
    zoneId,
    callback
  ) {

    let q = db
      .collection('sensorReadings')
      .where('farmId', '==', farmId);

    if (zoneId) {
      q = q.where('zoneId', '==', zoneId);
    }

    return q
      .orderBy('timestamp', 'desc')
      .limit(1)
      .onSnapshot(

        snap => {

          if (!snap.empty) {

            const d = snap.docs[0];

            const reading = {
              id: d.id,
              ...d.data()
            };

            console.log(
              'Latest Firebase sensor reading:',
              reading
            );

            callback(reading);

          } else {

            console.warn(
              'No sensor readings found for farm:',
              farmId
            );

            callback(null);
          }
        },

        error => {

          console.error(
            'Sensor subscription Firebase error:',
            error
          );

          callback(null);
        }
      );
  },


  async getSensorHistory(
    farmId,
    zoneId,
    hours = 24
  ) {

    const since = new Date(
      Date.now() - hours * 3600000
    );

    let q = db
      .collection('sensorReadings')
      .where('farmId', '==', farmId);

    if (zoneId) {
      q = q.where('zoneId', '==', zoneId);
    }

    const snap = await q
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'asc')
      .get();

    const readings = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log(
      'Sensor history loaded:',
      {
        farmId,
        zoneId,
        hours,
        count: readings.length
      }
    );

    return readings;
  },


  // ============================================================
  // ALERTS
  // ============================================================

  async getAlerts(
    farmId,
    filters = {}
  ) {

    let q = db
      .collection('alerts')
      .where('farmId', '==', farmId);

    if (filters.severity) {
      q = q.where(
        'severity',
        '==',
        filters.severity
      );
    }

    if (filters.resolved !== undefined) {
      q = q.where(
        'resolved',
        '==',
        filters.resolved
      );
    }

    const snap = await q
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  },


  subscribeToAlerts(
    farmId,
    callback
  ) {

    return db
      .collection('alerts')
      .where('farmId', '==', farmId)
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .onSnapshot(

        snap => {

          callback(
            snap.docs.map(d => ({
              id: d.id,
              ...d.data()
            }))
          );
        },

        error => {

          console.error(
            'Alerts subscription Firebase error:',
            error
          );

          callback([]);
        }
      );
  },


  async resolveAlert(alertId) {

    await db
      .collection('alerts')
      .doc(alertId)
      .update({
        resolved: true,
        resolvedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });
  },


  // ============================================================
  // AI ANALYSIS
  // ============================================================

  async getLatestAIAnalysis(
    farmId,
    zoneId = null
  ) {

    let q = db
      .collection('aiAnalyses')
      .where('farmId', '==', farmId);

    if (zoneId) {
      q = q.where('zoneId', '==', zoneId);
    }

    const snap = await q
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }

    const d = snap.docs[0];

    return {
      id: d.id,
      ...d.data()
    };
  },


  async getAIAnalysisHistory(
    farmId,
    limit = 20
  ) {

    const snap = await db
      .collection('aiAnalyses')
      .where('farmId', '==', farmId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  },


  // ============================================================
  // IRRIGATION
  // ============================================================

  async getIrrigationLogs(
    farmId,
    zoneId,
    limit = 30
  ) {

    let q = db
      .collection('irrigationLogs')
      .where('farmId', '==', farmId);

    if (zoneId) {
      q = q.where('zoneId', '==', zoneId);
    }

    const snap = await q
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  },


  // ============================================================
  // SYSTEM CONFIG
  // ============================================================

  async getSystemConfig() {

    const snap = await db
      .collection('systemConfig')
      .doc('main')
      .get();

    return snap.exists
      ? snap.data()
      : null;
  },


  async updateSystemConfig(data) {

    await db
      .collection('systemConfig')
      .doc('main')
      .set({
        ...data,
        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      }, {
        merge: true
      });
  },


  // ============================================================
  // CROP PROFILES
  // ============================================================

  async getCropProfiles() {

    const snap = await db
      .collection('cropProfiles')
      .get();

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  }
};
