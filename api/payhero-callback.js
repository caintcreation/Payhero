const ALLOWED_ORIGIN = 'https://caintcreation.github.io';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
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
    return res.status(400).json({ error: 'Invalid JSON callback payload' });
  }

  const transactionLog = {
    checkout_request_id: body.CheckoutRequestID || body.checkout_request_id || null,
    merchant_request_id: body.MerchantRequestID || body.merchant_request_id || null,
    reference: body.reference || body.external_reference || null,
    status: body.status || body.ResultDesc || body.result_description || null,
    result_code: body.ResultCode || body.result_code || null
  };

  console.log('PayHero callback received:', transactionLog);

  return res.status(200).json({ received: true });
}
