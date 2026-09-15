export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
    }
  
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': req.headers.host || 'https://agriguard.ai',
          'X-Title': 'AgriGuard AI'
        }
      });
  
      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: 'OpenRouter request failed', detail: err });
      }
  
      const data = await response.json();
  
      const models = (data.data || []).map(m => ({
        id: m.id,
        name: m.name || m.id,
        context_length: m.context_length,
        provider: m.id.split('/')[0],
        pricing: m.pricing || null
      }));
  
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ data: models });
    } catch (err) {
      console.error('Models API error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }