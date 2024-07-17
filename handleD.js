const { poolTracking } = require('./db'); // Import the poolTracking from db.js

async function handleD(message) {
  const tableName = 'extended_data';

  try {
    const tableCheckQuery = `SELECT to_regclass('${tableName}')`;
    const tableCheckResult = await poolTracking.query(tableCheckQuery); // Use poolTracking instead of pool1

    if (tableCheckResult.rows[0].to_regclass) {
      console.log(`Table ${tableName} exists.`);

      const columnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `;
      const columnResult = await poolTracking.query(columnQuery); // Use poolTracking instead of pool1
      const columns = columnResult.rows.map(row => row.column_name);

      console.log(`Columns in ${tableName}:`, columns);

      // เพิ่มค่า date และ timestamp จากเวลาปัจจุบัน GMT+7
      const now = new Date();
      const gmt7Offset = 7 * 60 * 60 * 1000;
      const gmt7Time = new Date(now.getTime() + gmt7Offset);

      const dateValue = gmt7Time.toISOString().split('T')[0]; // แปลงเป็น yyyy-mm-dd
      const timestampValue = gmt7Time.toISOString().replace('T', ' ').split('.')[0]; // แปลงเป็น yyyy-mm-dd hh:mm:ss

      // Fetch the latest imei from the latest date and time in login_device
      const imeiQuery = `
        SELECT imei 
        FROM login_device 
        WHERE (date, time) = (
          SELECT date, MAX(time)
          FROM login_device
          WHERE date = (SELECT MAX(date) FROM login_device)
          GROUP BY date
        )
      `;
      const imeiResult = await poolTracking.query(imeiQuery); // Use poolTracking instead of pool1

      if (imeiResult.rows.length > 0) {
        const imei = imeiResult.rows[0].imei;

        // เตรียมข้อมูลสำหรับการ insert โดยมี date, timestamp, imei ก่อน
        const values = [`'${dateValue}'`, `'${timestampValue}'`, `'${imei}'`];

        // แยกข้อมูลจาก message
        if (message.length > 2) {
          console.log(`Raw column data: ${message[2]}`);
          const columnData = message[2].split(';');
          const cleanedData = columnData.map(item => item.replace(/\r\n\x00/g, ''));
          console.log(`Split column data:`, cleanedData);

          cleanedData.forEach((item, idx) => {
            if (columns[idx + 3]) { // บวก 3 เพื่อข้าม date, timestamp, imei
              if (item === 'NA') {
                values.push('NULL'); // ใส่ค่า NULL ถ้า item เป็น 'NA'
              } else {
                if (idx === 2 || idx === 4) { // ตรวจสอบ index ที่ต้องการหาร 100
                  values.push(`'${item / 100}'`);
                } else {
                  values.push(`'${item}'`);
                }
              }
            }
          });

          console.log(`Values to insert:`, values);

          // ทำการ insert ข้อมูลลงในตาราง
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${values.join(', ')});
          `;

          console.log(`Insert Query: ${insertQuery}`);

          await poolTracking.query(insertQuery); // Use poolTracking instead of pool1
          console.log(`Inserted data into table ${tableName}`);
        } else {
          console.log('No data found to insert.');
        }
      } else {
        console.log('No imei found in login_device table.');
      }
    } else {
      console.log(`Table ${tableName} does not exist.`);
    }
  } catch (err) {
    console.error('Database error:', err);
  }
}

module.exports = { handleD };
