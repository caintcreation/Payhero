const ALLOWED_ORIGIN = 'https://caintcreation.github.io';
const PAYHERO_PAYMENTS_URL = 'https://api.payhero.africa/api/v2/payments';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

function normalizeKenyanPhone(phoneInput) {
  const cleaned = String(phoneInput || '').replace(/\s+/g, '').replace(/^\+/, '');

  if (/^07\d{8}$/.test(cleaned) || /^01\d{8}$/.test(cleaned)) {
    return '254' + cleaned.slice(1);
  }

  if (/^2547\d{8}$/.test(cleaned) || /^2541\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function parseAmount(rawAmount) {
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function safeParseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return null;
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return null;
}

function extractSafeUpstreamMessage(data, rawText) {
  if (data && typeof data === 'object') {
    return data.error || data.message || data.detail || data.details || null;
  }

  if (typeof rawText === 'string' && rawText.trim()) {
    return rawText.slice(0, 500);
  }

  return null;
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = safeParseBody(req.body);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }

  const amount = parseAmount(body.amount);
  const phone_number = normalizeKenyanPhone(body.phone_number);

  if (amount === null || !phone_number) {
    return res.status(400).json({
      error: 'A valid positive amount and Kenyan phone number are required'
    });
  }

  const {
    PAYHERO_USERNAME,
    PAYHERO_PASSWORD,
    PAYHERO_CHANNEL_ID,
    PAYHERO_ACCOUNT_ID,
    PAYHERO_CALLBACK_URL
  } = process.env;

  if (!PAYHERO_USERNAME || !PAYHERO_PASSWORD || !PAYHERO_CHANNEL_ID || !PAYHERO_ACCOUNT_ID || !PAYHERO_CALLBACK_URL) {
    return res.status(500).json({ error: 'Payment service is not fully configured' });
  }

  const external_reference = typeof body.external_reference === 'string' && body.external_reference.trim()
    ? body.external_reference.trim().slice(0, 100)
    : `REF-${Date.now()}`;

  const auth = Buffer.from(`${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`).toString('base64');

  try {
    const upstreamResponse = await fetch(PAYHERO_PAYMENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        phone_number,
        channel_id: Number(PAYHERO_CHANNEL_ID),
        account_id: Number(PAYHERO_ACCOUNT_ID),
        provider: 'm-pesa',
        external_reference,
        callback_url: PAYHERO_CALLBACK_URL
      })
    });

    const rawText = await upstreamResponse.text();
    let upstreamData = {};
    let parsedAsJson = false;

    if (rawText) {
      try {
        upstreamData = JSON.parse(rawText);
        parsedAsJson = true;
      } catch (error) {
        upstreamData = {};
      }
    }

    const safeMessage = extractSafeUpstreamMessage(upstreamData, rawText);

    if (parsedAsJson) {
      return res.status(upstreamResponse.status).json({
        success: upstreamResponse.ok,
        status: upstreamData.status || null,
        reference: upstreamData.reference || upstreamData.CheckoutRequestID || null,
        message: safeMessage,
        upstream: upstreamData
      });
    }

    return res.status(upstreamResponse.status).json({
      success: upstreamResponse.ok,
      message: safeMessage || 'Upstream service returned a non-JSON response',
      upstream_error: !upstreamResponse.ok ? 'Unable to parse upstream error details' : null
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to reach PayHero service',
      details: error && error.message ? error.message : 'Unknown network error'
    });
  }
}
