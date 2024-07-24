// utils.js
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
  
  // ฟังก์ชันสำหรับแปลง ASCII string เป็น hex string
  function asciiToHex(str) {
    let hexStr = '';
    for (let i = 0; i < str.length; i++) {
      const hex = str.charCodeAt(i).toString(16);
      hexStr += ('0' + hex).slice(-2);
    }
    return hexStr;
  }
  
  module.exports = { hexToAscii, calculateCRC16, asciiToHex };
  
  