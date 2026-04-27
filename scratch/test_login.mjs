async function test() {
  const email = 'admin@worker_1.com';
  const password = 'password123';
  const tenant = 'worker_1';
  const url = 'http://localhost:8000/api/auth/login/';

  console.log(`Testing login for ${email} on ${tenant}...`);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant': tenant
    },
    body: JSON.stringify({ email, password })
  });

  console.log(`Status: ${resp.status}`);
  const body = await resp.text();
  console.log(`Body: ${body}`);
}

test();
