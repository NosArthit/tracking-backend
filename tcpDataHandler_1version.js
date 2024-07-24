// tcpDataHandler.js

const { handleD } = require('./handleD');
const { handleL } = require('./handleL copy');
const { hexToAscii, calculateCRC16 } = require('./utils');

async function handleTcpData(data) {
  // แปลงข้อมูลจาก hex string เป็น ASCII string
  const asciiData = hexToAscii(data);
  const messages = asciiData.split('#');  // Split data ด้วย #
  console.log('Convert to ascii data:', asciiData);

  if (messages.length === 3) { // Corrected comparison operator
    // Split messages[2] ด้วย ;
    const splitData = messages[2].split(';');
    
    // คำนวณ CRC-16-IBM จากข้อมูลที่ไม่รวมข้อมูลสี่ตัวอักษรสุดท้ายหลัง ;
    const crcData = (splitData.slice(0, -1).join(';') + ';');
    console.log('ascii data to CRC-16-IBM :', crcData);
    const crcValue = calculateCRC16(crcData);
    console.log('CRC-16-IBM value:', crcValue);

    if (splitData[splitData.length - 1].toString() === crcValue.toString()) { // Corrected CRC validation
      console.log('CRC-16 verification passed.');
      // ตรวจสอบ identifier และเรียก handleD หรือ handleL
      const packageType = messages[1].trim();
      let response = '';

      if (packageType === 'L') {
        await handleL(asciiData);
      } else if (packageType === 'D') {
        await handleD(messages);
      } else {
        console.log(`Unknown package type: ${packageType}`);
      }

      if (response) {
        // แปลง response จาก ASCII เป็น hex string
        const hexResponse = asciiToHex(response);
        console.log('Response in hex:', hexResponse);
    
        // ส่งข้อความตอบกลับไปยัง TCP module
        socket.write(Buffer.from(hexResponse, 'hex'));
      }

    } else {
      console.log('CRC-16 verification failed.');
    }
  } else {
    console.log('No valid data to process.');
  }
}

module.exports = { handleTcpData };
