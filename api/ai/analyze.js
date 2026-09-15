import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  try {
    const configSnap = await db.collection('systemConfig').doc('main').get();
    const config = configSnap.exists ? configSnap.data() : {};
    const model = config.selectedModel || 'openai/gpt-4o-mini';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens ?? 1024;

    if (!config.aiEnabled && config.aiEnabled !== undefined) {
      return res.status(400).json({ error: 'AI is disabled in system config' });
    }

    const { farmId: reqFarmId } = req.body || {};
    let farmId = reqFarmId || config.defaultFarmId;

    if (!farmId) {
      const farmsSnap = await db.collection('farms').limit(1).get();
      if (!farmsSnap.empty) farmId = farmsSnap.docs[0].id;
    }

    if (!farmId) {
      return res.status(400).json({ error: 'No farm configured' });
    }

    const readingsSnap = await db.collection('sensorReadings')
      .where('farmId', '==', farmId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const readings = readingsSnap.docs.map(d => d.data());
    const latest = readings[0] || {};

    const cropsSnap = await db.collection('cropProfiles').limit(1).get();
    const crop = cropsSnap.empty ? {} : cropsSnap.docs[0].data();

    const prompt = `You are an agricultural AI analyst for a smart farming IoT system called AgriGuard AI.

Analyze the following sensor data and provide a structured JSON assessment.

LATEST SENSOR READINGS:
- Soil Moisture: ${latest.soilMoisture ?? 'N/A'}%
- Temperature: ${latest.temperature ?? 'N/A'}°C
- Humidity: ${latest.humidity ?? 'N/A'}%
- Water Level: ${latest.waterLevel ?? 'N/A'}%
- Flow Rate: ${latest.flowRate ?? 'N/A'}
- Light Level: ${latest.lightLevel ?? 'N/A'}
- Pump Status: ${latest.pumpStatus ? 'ON' : 'OFF'}
- Device Status: ${latest.deviceStatus || 'unknown'}

RECENT TREND (${readings.length} readings):
${readings.slice(0, 5).map((r, i) => `Reading ${i + 1}: moisture=${r.soilMoisture}%, temp=${r.temperature}°C, humidity=${r.humidity}%`).join('\n')}

CROP PROFILE:
- Target Moisture: ${crop.targetMoisture ?? 'N/A'}%
- Min Moisture: ${crop.minimumMoisture ?? 'N/A'}%
- Max Moisture: ${crop.maximumMoisture ?? 'N/A'}%
- Min Temperature: ${crop.minTemperature ?? 'N/A'}°C
- Max Temperature: ${crop.maxTemperature ?? 'N/A'}°C

IMPORTANT RULES:
- Do NOT claim to diagnose plant diseases from sensor data alone.
- Use cautious language: "possible stress", "sensor readings suggest", etc.
- healthScore must be 0-100 integer.
- confidence must be 0-1 float.
- Return ONLY valid JSON, no markdown, no explanation outside JSON.

Return this exact JSON structure:
{
  "healthScore": 87,
  "healthStatus": "healthy",
  "waterStress": "low",
  "temperatureStatus": "normal",
  "anomalyDetected": false,
  "irrigationRequired": false,
  "confidence": 0.91,
  "summary": "Brief summary of conditions.",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.host || 'https://agriguard.ai',
        'X-Title': 'AgriGuard AI'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return res.status(aiRes.status).json({ error: 'OpenRouter API error', detail: errText });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response as JSON', raw: rawContent.slice(0, 500) });
    }

    parsed.healthScore = Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore) || 50)));
    parsed.confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));
    parsed.healthStatus = String(parsed.healthStatus || 'unknown').toLowerCase();
    parsed.waterStress = String(parsed.waterStress || 'unknown').toLowerCase();
    parsed.temperatureStatus = String(parsed.temperatureStatus || 'unknown').toLowerCase();
    parsed.anomalyDetected = Boolean(parsed.anomalyDetected);
    parsed.irrigationRequired = Boolean(parsed.irrigationRequired);
    parsed.summary = String(parsed.summary || '');
    parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [];

    const analysisDoc = {
      farmId,
      zoneId: latest.zoneId || '',
      model,
      healthScore: parsed.healthScore,
      healthStatus: parsed.healthStatus,
      waterStress: parsed.waterStress,
      temperatureStatus: parsed.temperatureStatus,
      anomalyDetected: parsed.anomalyDetected,
      irrigationRequired: parsed.irrigationRequired,
      confidence: parsed.confidence,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('aiAnalyses').add(analysisDoc);

    return res.status(200).json({ success: true, analysis: analysisDoc });
  } catch (err) {
    console.error('Analyze API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}