const { poolTracking } = require('./db'); // Import the poolTracking from db.js

async function handleL(message) {
  const tableName = 'login_device';

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

      // เพิ่มค่า date และ timestamp จากเวลาปัจจุบัน GMT+7
      const now = new Date();
      const gmt7Offset = 7 * 60 * 60 * 1000;
      const gmt7Time = new Date(now.getTime() + gmt7Offset);

      const dateValue = gmt7Time.toISOString().split('T')[0]; // แปลงเป็น yyyy-mm-dd
      const timestampValue = gmt7Time.toISOString().replace('T', ' ').split('.')[0]; // แปลงเป็น yyyy-mm-dd hh:mm:ss

              // เตรียมข้อมูลสำหรับการ insert โดยมี date, timestamp, imei ก่อน
              const values = [`'${dateValue}'`, `'${timestampValue}'`];

      if (message.length > 2) {
        console.log(`Raw column data: ${message[2]}`);
        const columnData = message[2].trim().split(';');
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

        console.log(`Values to insert:`, values);

        // ทำการ insert ข้อมูลลงในตาราง
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${values.join(', ')});
        `;

        console.log(`Insert Query: ${insertQuery}`);

        await poolTracking.query(insertQuery);
        console.log(`Inserted data into table ${tableName}`);
      } else {
        console.log('No data found to insert.');
      }
    } else {
      console.log(`Table ${tableName} does not exist.`);
    }
  } catch (err) {
    console.error('Database error:', err);
  }
}

module.exports = { handleL };


