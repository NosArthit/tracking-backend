const { handleD } = require('./handleD');
const { handleL } = require('./handleL');
const { hexToAscii } = require('./utils');

async function handleTcpData(data) {
  // แปลงข้อมูลจาก hex string เป็น ASCII string
  const asciiData = hexToAscii(data);
  console.log('Convert to ascii data:', asciiData);

  // ตรวจสอบ identifier และเรียก handleD หรือ handleL
  const messages = asciiData.split('#');
  const packageType = messages[1]?.trim();
  let response = '';

  if (packageType === 'L') {
    response = await handleL(asciiData);
  } else if (packageType === 'D') {
    response = await handleD(asciiData);
  } else {
    console.log(`Unknown package type: ${packageType}`);
  }

  return response;
}

module.exports = { handleTcpData };


