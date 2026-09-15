async function seedDemoData(uid, existingFarmId) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const ts = (hoursAgo) => firebase.firestore.Timestamp.fromDate(new Date(Date.now() - hoursAgo * 3600000));
  
    await db.collection('users').doc(uid).set({
      name: 'Demo Farmer',
      email: 'demo@agriguard.ai',
      role: 'admin',
      farmId: existingFarmId || 'demo-farm-001',
      createdAt: now,
      lastLoginAt: now
    }, { merge: true });
  
    const farmId = existingFarmId || 'demo-farm-001';
    await db.collection('farms').doc(farmId).set({
      name: 'Green Valley Farm',
      location: 'Central Valley, CA',
      ownerId: uid,
      cropType: 'Tomato',
      status: 'active',
      totalZones: 2,
      createdAt: now
    }, { merge: true });
  
    const zones = [
      { id: 'zone-a1', name: 'Zone A1 — North Field', cropType: 'Tomato', targetMoisture: 60, minimumMoisture: 40, maximumMoisture: 80, autoIrrigation: true, pumpStatus: 'OFF', deviceStatus: 'online' },
      { id: 'zone-b2', name: 'Zone B2 — South Field', cropType: 'Pepper', targetMoisture: 55, minimumMoisture: 35, maximumMoisture: 75, autoIrrigation: false, pumpStatus: 'OFF', deviceStatus: 'online' }
    ];
    for (const z of zones) {
      await db.collection('zones').doc(z.id).set({ farmId, ...z, createdAt: now }, { merge: true });
    }
  
    for (let i = 48; i >= 0; i--) {
      const t = ts(i * 0.5);
      const base = 55 + Math.sin(i / 6) * 15;
      await db.collection('sensorReadings').add({
        farmId,
        zoneId: 'zone-a1',
        soilMoisture: Math.round(base + (Math.random() - 0.5) * 8),
        temperature: +(26 + Math.sin(i / 8) * 6 + (Math.random() - 0.5) * 2).toFixed(1),
        humidity: Math.round(60 + (Math.random() - 0.5) * 20),
        waterLevel: Math.round(74 - i * 0.3 + (Math.random() - 0.5) * 5),
        flowRate: +(1.2 + (Math.random() - 0.5) * 0.4).toFixed(2),
        lightLevel: Math.round(Math.max(0, 800 * Math.sin((48 - i) / 48 * Math.PI) + (Math.random() - 0.5) * 100)),
        pumpStatus: i % 12 === 0,
        deviceStatus: 'online',
        timestamp: t
      });
    }
  
    await db.collection('cropProfiles').add({
      name: 'Tomato',
      minimumMoisture: 40,
      targetMoisture: 60,
      maximumMoisture: 80,
      minTemperature: 18,
      maxTemperature: 32,
      description: 'Standard greenhouse tomato profile',
      createdAt: now
    });
  
    const triggers = ['automatic', 'manual', 'ai_recommendation'];
    for (let i = 0; i < 8; i++) {
      await db.collection('irrigationLogs').add({
        farmId,
        zoneId: 'zone-a1',
        trigger: triggers[i % 3],
        reason: i % 3 === 0 ? 'Moisture below threshold' : i % 3 === 1 ? 'Manual activation' : 'AI recommended irrigation',
        status: 'completed',
        durationSeconds: 300 + Math.round(Math.random() * 600),
        waterUsedLiters: +(15 + Math.random() * 30).toFixed(1),
        startedAt: ts(i * 6 + 2),
        endedAt: ts(i * 6)
      });
    }
  
    const alertDefs = [
      { type: 'low_moisture', severity: 'warning', title: 'Low Soil Moisture', message: 'Zone A1 moisture dropped below 40%.', resolved: false },
      { type: 'high_temperature', severity: 'critical', title: 'High Temperature Alert', message: 'Temperature exceeded 35°C in Zone A1.', resolved: true },
      { type: 'low_water', severity: 'warning', title: 'Water Tank Low', message: 'Water tank level below 30%.', resolved: false },
      { type: 'sensor_error', severity: 'info', title: 'Sensor Calibration', message: 'Humidity sensor may need recalibration.', resolved: true }
    ];
    for (let i = 0; i < alertDefs.length; i++) {
      await db.collection('alerts').add({
        farmId,
        zoneId: 'zone-a1',
        ...alertDefs[i],
        createdAt: ts(i * 8),
        resolvedAt: alertDefs[i].resolved ? ts(i * 8 - 2) : null
      });
    }
  
    await db.collection('aiAnalyses').add({
      farmId,
      zoneId: 'zone-a1',
      model: 'openai/gpt-4o-mini',
      healthScore: 87,
      healthStatus: 'healthy',
      waterStress: 'low',
      temperatureStatus: 'normal',
      anomalyDetected: false,
      irrigationRequired: false,
      confidence: 0.91,
      summary: 'The crop is currently healthy and soil moisture is within the recommended range. Temperature is normal for this time of day. Continue standard monitoring.',
      recommendations: [
        'Continue monitoring soil moisture levels',
        'Monitor afternoon temperature trends',
        'Water tank level is adequate but monitor over next 48 hours'
      ],
      createdAt: ts(1)
    });
  
    await db.collection('systemConfig').doc('main').set({
      selectedModel: 'openai/gpt-4o-mini',
      aiEnabled: true,
      temperature: 0.7,
      maxTokens: 1024,
      analysisIntervalMinutes: 30,
      defaultFarmId: farmId,
      maintenanceMode: false,
      updatedAt: now
    }, { merge: true });
  }
  
  window.seedDemoData = seedDemoData;