// api/paymob.js

export default async function handler(req, res) {
  // بنسمح بطلبات الـ POST بس (عشان الأمان)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, billingData } = req.body;

  // بنسحب المفاتيح من ملف الـ .env (مش هنكتبهم في الكود مباشرة)
  const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
  const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;

  try {
    // 1. Authentication (توثيق الحساب)
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    });
    const authData = await authResponse.json();
    const token = authData.token;

    // 2. Order Registration (إنشاء الأوردر في بيموب)
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: amount * 100, // بيموب بتتعامل بالقروش (100 جنيه = 10000 قرش)
        currency: "EGP",
        items: []
      })
    });
    const orderData = await orderResponse.json();

    // 3. Payment Key Request (استخراج مفتاح الدفع)
    const keyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amount * 100,
        expiration: 3600, // المفتاح بيفسد بعد ساعة
        order_id: orderData.id,
        billing_data: billingData, // بيانات العميل (الاسم، الإيميل، التليفون)
        currency: "EGP",
        integration_id: INTEGRATION_ID
      })
    });
    const keyData = await keyResponse.json();

    // بنبعت مفتاح الدفع للـ Frontend بتاعنا
    res.status(200).json({ paymentToken: keyData.token });

  } catch (error) {
    console.error("Paymob Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}