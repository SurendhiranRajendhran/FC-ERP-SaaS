const nodemailer = require('nodemailer');

async function testWrongPort() {
  // If port is string '465', '465' === 465 is false -> secure: false
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: false, // simulating '465' === 465 failure
    auth: {
      user: 'info@radinfotec.com',
      pass: 'Ranjith@1521'
    },
    connectionTimeout: 5000
  });

  try {
    console.log('Testing secure: false on port 465...');
    await transporter.verify();
    console.log('SUCCESS');
  } catch (err) {
    console.log('FAILED as expected with secure:false:', err.message);
  }
}

testWrongPort();
