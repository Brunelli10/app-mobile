const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const apiUrl = `http://${localIp}:3000/api`;

const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const key = 'EXPO_PUBLIC_API_URL';
const linePattern = new RegExp(`^${key}=.*$`, 'm');

if (linePattern.test(envContent)) {
  envContent = envContent.replace(linePattern, `${key}=${apiUrl}`);
} else {
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `${key}=${apiUrl}\n`;
}

fs.writeFileSync(envPath, envContent, 'utf8');
console.log(`[IP CONFIG] Configured local IP ${localIp} -> ${apiUrl} in mobile/.env`);
