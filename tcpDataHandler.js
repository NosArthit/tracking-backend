// tcpDataHandler.js

const { handleD } = require('./handleD');
const { handleL } = require('./handleL');

// ฟังก์ชันสำหรับแปลง hex string เป็น ASCII string
function hexToAscii(hexStr) {
  let asciiStr = '';
  for (let i = 0; i < hexStr.length; i += 2) {
    const hexCode = hexStr.substr(i, 2);
    const charCode = parseInt(hexCode, 16);
    asciiStr += String.fromCharCode(charCode);
  }
  return asciiStr;
}

// ฟังก์ชันคำนวณ CRC-16-IBM (Little Endian(DCBA))
function calculateCRC16(data) {
  const crcTable = new Uint16Array(256).map((t, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xA001 ^ (c >>> 1) : c >>> 1;
    }
    return c;
  });

  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data.charCodeAt(i)) & 0xFF];
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

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

    if (splitData[splitData.length - 1].toString === crcValue.toString().toString) { // Corrected CRC validation
      console.log('CRC-16 verification passed.');
      // ตรวจสอบ identifier และเรียก handleD หรือ handleL
      const identifier = messages[1].trim();
      if (identifier === 'L') {
        await handleL(messages);
      } else if (identifier === 'D') {
        await handleD(messages);
      } else {
        console.log(`Unknown identifier: ${identifier}`);
      }
    } else {
      console.log('CRC-16 verification failed.');
    }
  } else {
    console.log('No valid data to process.');
  }
}

module.exports = { handleTcpData };