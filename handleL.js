const { poolTracking } = require('./db');
const { calculateCRC16, asciiToHex } = require('./utils');

async function handleL(asciiData) {
  const tableName = 'login_device';
  const messages = asciiData.split('#');
  const splitData = messages[2].split(';');

  // ตรวจสอบความถูกต้องของข้อมูลแต่ละ index
  const version = splitData[0];
  const password = splitData[2];

  // คำนวณ CRC-16-IBM
  const crcData = (splitData.slice(0, -1).join(';') + ';');
  const crcValue = calculateCRC16(crcData);

  // ตรวจสอบรูปแบบโครงสร้างเบื้องต้น
  if (!asciiData.startsWith('#L#')) {
    console.log('Invalid Login Package Structure');
    return;
  }

  if (messages.length < 3 || messages[1] !== 'L') {
    console.log('Invalid Login message format');
    return;
  }

  if (splitData.length !== 4) {
    console.log('Insufficient data');
    return;
  }

  if (version !== '2.0') {
    console.log('Invalid version');
    // ส่งกลับ #AL#0
    return asciiToHex('#AL#0');
  }

  if (!password) {
    console.log('Invalid IMEI');
    // ส่งกลับ #AL#01
    return asciiToHex('#AL#01');
  }

  if (splitData[splitData.length - 1].toString() === crcValue.toString()) {
    //console.log('ascii data to CRC-16-IBM :', crcData);
    console.log('CRC-16-IBM value:', crcValue);
    console.log('Checksum verification error');
    // ส่งกลับ #AL#10
    return asciiToHex('#AL#10');
  }

  console.log('CRC verification passed');
  // ส่งกลับ #AL#1
  // เพิ่มค่า date และ timestamp จากเวลาปัจจุบัน GMT+7
  const now = new Date();
  const gmt7Offset = 7 * 60 * 60 * 1000;
  const gmt7Time = new Date(now.getTime() + gmt7Offset);

  const dateValue = gmt7Time.toISOString().split('T')[0]; // แปลงเป็น yyyy-mm-dd
  const timestampValue = gmt7Time.toISOString().replace('T', ' ').split('.')[0]; // แปลงเป็น yyyy-mm-dd hh:mm:ss

  // เตรียมข้อมูลสำหรับการ insert โดยมี date, timestamp, imei ก่อน
  const values = [`'${dateValue}'`, `'${timestampValue}'`];

  // ทำการ insert ข้อมูลลงในตาราง
  try {
    const tableCheckQuery = `SELECT to_regclass('${tableName}')`;
    const tableCheckResult = await poolTracking.query(tableCheckQuery);

    if (tableCheckResult.rows[0].to_regclass) {
      console.log(`Table ${tableName} exists.`);

      const columnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `;
      const columnResult = await poolTracking.query(columnQuery);
      const columns = columnResult.rows.map(row => row.column_name);

      console.log(`Columns in ${tableName}:`, columns);

      console.log(`Raw column data: ${messages[2]}`);
      const columnData = messages[2].trim().split(';');
      const cleanedData = columnData.map(item => item.replace(/\r\n\x00/g, ''));
      console.log(`Split column data:`, cleanedData);

      cleanedData.forEach((item, idx) => {
        if (columns[idx + 2]) { // Adjust index to account for shifted columns
          if (item === 'NA') {
            values.push('NULL'); // Set NULL if item is 'NA'
          } else {
            values.push(`'${item}'`);
          }
        }
      });

      // Add NULL values for the rest of the columns that don't have data
      while (values.length < columns.length) {
        values.push('NULL');
      }

      console.log(`Values to insert:`, values);

      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${values.join(', ')});
      `;

      console.log(`Insert Query: ${insertQuery}`);

      await poolTracking.query(insertQuery);
      console.log(`Inserted data into table ${tableName}`);
    } else {
      console.log(`Table ${tableName} does not exist.`);
    }
  } catch (err) {
    console.error('Database error:', err);
  }

  return asciiToHex('#AL#1');
}

module.exports = { handleL };






