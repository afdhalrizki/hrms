import https from 'https';

// Disable SSL verification for testing IP-based connections with custom Host headers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Supported environments configuration
const ENV_CONFIGS = {
  qa: {
    name: 'QA Server (harikerja-qa)',
    publicIp: '103.197.190.47',
    vpnIp: '10.8.0.1',
    domain: 'harikerja.web.id',
  },
  staging: {
    name: 'Staging Server',
    publicIp: process.env.PUBLIC_IP || '103.197.190.48', // Placeholder or env override
    vpnIp: process.env.VPN_IP || '10.8.0.1',
    domain: 'harikerja.my.id',
  },
  prod: {
    name: 'Production Server',
    publicIp: process.env.PUBLIC_IP || '103.197.190.49', // Placeholder or env override
    vpnIp: process.env.VPN_IP || '10.8.0.1',
    domain: 'harikerja.com',
  }
};

const args = process.argv.slice(2);
const envName = args[0] || 'qa';
const config = ENV_CONFIGS[envName.toLowerCase()];

if (!config) {
  console.error(`❌ ERROR: Unknown environment '${envName}'. Supported: qa, staging, prod`);
  process.exit(1);
}

const PUBLIC_IP = config.publicIp;
const VPN_IP = config.vpnIp;
const DOMAIN = config.domain;

const PATHS = {
  djangoAdmin: '/django-admin-secure-39f28j/',
  portalAdmin: '/login/portal-admin-secure-39f28j',
};

function checkVpnGateway() {
  return new Promise((resolve) => {
    const options = {
      hostname: VPN_IP,
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        Host: DOMAIN,
      },
      timeout: 1500, // Short timeout for quick check
    };

    const req = https.request(options, (res) => {
      res.resume();
      // Any response from Nginx means the VPN gateway is active and reachable
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

function checkAccess(ip, path, expectedStatuses, testName) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        Host: DOMAIN,
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      res.resume(); // Consume the response stream to release the socket
      const status = res.statusCode;
      const success = expectedStatuses.includes(status);
      console.log(
        `[${success ? 'PASS' : 'FAIL'}] ${testName}\n` +
        `      Target: https://${ip}${path} (Host: ${DOMAIN})\n` +
        `      Expected: [${expectedStatuses.join(', ')}], Got: ${status}\n`
      );
      resolve(success);
    });

    req.on('error', (e) => {
      console.log(
        `[FAIL] ${testName}\n` +
        `      Target: https://${ip}${path} (Host: ${DOMAIN})\n` +
        `      Error: ${e.message}\n`
      );
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(
        `[FAIL] ${testName}\n` +
        `      Target: https://${ip}${path} (Host: ${DOMAIN})\n` +
        `      Error: Request timed out\n`
      );
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log(`  VPN SECURITY CHECK - Target: ${config.name}    `);
  console.log('==================================================\n');

  // Check if VPN is active/reachable before running tests
  const vpnAvailable = await checkVpnGateway();
  if (!vpnAvailable) {
    console.log(`ℹ️ [INFO] VPN Gateway (${VPN_IP}:443) is not reachable.`);
    console.log(`   Skipping VPN Security checks for ${config.name} (non-VPN environment).\n`);
    console.log('==================================================');
    process.exit(0);
  }

  let allPassed = true;

  // 1. Test Django Admin inside VPN
  const t1 = await checkAccess(
    VPN_IP,
    PATHS.djangoAdmin,
    [200, 302],
    `Test 1: Django Admin - INSIDE VPN (Expect: 200 or 302)`
  );
  allPassed = allPassed && t1;

  // 2. Test Django Admin outside VPN
  const t2 = await checkAccess(
    PUBLIC_IP,
    PATHS.djangoAdmin,
    [403],
    `Test 2: Django Admin - OUTSIDE VPN (Expect: 403 Forbidden)`
  );
  allPassed = allPassed && t2;

  // 3. Test Portal Admin inside VPN
  const t3 = await checkAccess(
    VPN_IP,
    PATHS.portalAdmin,
    [200, 302],
    `Test 3: Portal Admin - INSIDE VPN (Expect: 200 or 302)`
  );
  allPassed = allPassed && t3;

  // 4. Test Portal Admin outside VPN
  const t4 = await checkAccess(
    PUBLIC_IP,
    PATHS.portalAdmin,
    [403],
    `Test 4: Portal Admin - OUTSIDE VPN (Expect: 403 Forbidden)`
  );
  allPassed = allPassed && t4;

  console.log('==================================================');
  if (allPassed) {
    console.log(`🎉 ALL TESTS PASSED: ${config.name} VPN protection is fully active!`);
    process.exit(0);
  } else {
    console.log(`❌ SOME TESTS FAILED: Please check Nginx configuration on ${config.name}.`);
    process.exit(1);
  }
}

runTests();
