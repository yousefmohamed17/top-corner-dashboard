export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, billingData } = req.body;

  const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
  const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;

  if (!PAYMOB_API_KEY || !INTEGRATION_ID) {
    console.error("Missing Paymob API Key or Integration ID in Vercel settings.");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 1. Authentication
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    });
    const authData = await authResponse.json();
    const token = authData.token;

    // 2. Order Registration
    // تأمين الرقم عشان بيموب بتقبل قروش بس (بدون كسور)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: amountInCents, 
        currency: "EGP",
        items: []
      })
    });
    const orderData = await orderResponse.json();

    // 3. Payment Key Request
    const keyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountInCents,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: billingData,
        currency: "EGP",
        integration_id: INTEGRATION_ID
      })
    });
    const keyData = await keyResponse.json();

    if (keyData.token) {
      res.status(200).json({ paymentToken: keyData.token });
    } else {
      console.error("Paymob missing token in response:", keyData);
      res.status(400).json({ error: 'Failed to generate payment token from Paymob' });
    }

  } catch (error) {
    console.error("Paymob Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}