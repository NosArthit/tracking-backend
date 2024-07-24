
// userAPI.js
const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { poolUser } = require('./db'); // เปลี่ยนจาก dbUser เป็น db ตามการรวมไฟล์
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key'; // ควรเก็บเป็นความลับและไม่ควรเขียนตรงนี้ในโค้ดจริง
const saltRounds = parseInt(process.env.SALT_ROUNDS);

// ฟังก์ชั่นสำหรับการสร้าง user_id
async function generateUserId(countryCode) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน (มกราคม = 01)
  const year = String(now.getFullYear()).slice(-2); // ปี (เช่น 2023 = 23)
  const prefix = `${year}${month}`;

  // ค้นหาค่า user_id ล่าสุดที่มี prefix เดียวกัน
  const query = `
    SELECT user_id FROM user_data 
    WHERE user_id LIKE $1 
    ORDER BY user_id DESC 
    LIMIT 1
  `;
  const values = [`${prefix}${countryCode}%`];

  const result = await poolUser.query(query, values);
  let nextId = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].user_id;
    const lastSeq = parseInt(lastId.slice(-4), 10);
    nextId = (lastSeq + 1) % 10000; // วนกลับที่ 0001 เมื่อถึง 9999
  }
  const userId = `${prefix}${'00'}${countryCode}${String(nextId).padStart(4, '0')}`;
  return userId;
}

// register
router.post('/register', async (req, res) => {
  const { firstname, lastname, company, address, city, state, country, postal_code, phone, email, password } = req.body;

  if (!firstname || !lastname || !company || !address || !city || !state || !country || !postal_code || !phone || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  // สมมุติว่าชื่อย่อของประเทศอยู่ในตัวแปร `countryCode`
  const countryCode = country.slice(0, 3).toUpperCase(); // เอาเฉพาะ 3 ตัวอักษรแรกของ country และแปลงเป็นตัวใหญ่
  const user_id = await generateUserId(countryCode); // สร้าง user_id โดยใช้ countryCode

  const hashedPassword = await bcrypt.hash(password, saltRounds); // hash รหัสผ่าน

  const now = new Date();
  const options = { timeZone: 'Asia/Bangkok' };

  const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
  const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

  const insertQuery = `
    INSERT INTO user_data (date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `;
  const values = [dateValue, timeValue, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, hashedPassword];

  try {
    await poolUser.query(insertQuery, values);
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }

  const selectQuery = 'SELECT * FROM user_data WHERE email = $1';

  try {
    const result = await poolUser.query(selectQuery, [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // ตรวจสอบค่าสถานะของผู้ใช้
      if (user.status !== true) {
        return res.status(401).json({
          message: "Your account is not approved",
        });
      }

      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        // บันทึกเวลาล็อกอิน
        const now = new Date();
        const options = { timeZone: 'Asia/Bangkok' };
        const dateValue = now.toLocaleDateString('en-GB', options); // dd/mm/yyyy
        const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

        const insertTimeQuery = `
          INSERT INTO user_time (user_id, user_date_login, user_time_login)
          VALUES ($1, $2, $3)
        `;
        await poolUser.query(insertTimeQuery, [user.user_id, dateValue, timeValue]);

        res.json({
          success: true,
          message: "Login successful",
          token: token,
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Login failed",
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Login failed",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Logout
router.post('/logout', verifyToken, async (req, res) => {
  const user_id = req.authData.user_id;

  if (!user_id) {
    return res.status(400).send('User ID is required');
  }

  const now = new Date();
  const options = { timeZone: 'Asia/Bangkok' };

  const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
  const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

  const updateTimeQuery = `
    WITH latest_entry AS (
      SELECT ctid
      FROM user_time
      WHERE user_id = $1 AND user_date_logout IS NULL
      ORDER BY user_date_login DESC, user_time_login DESC
      LIMIT 1
    )
    UPDATE user_time
    SET user_date_logout = $2, user_time_logout = $3
    WHERE ctid IN (SELECT ctid FROM latest_entry)
  `;

  try {
    await poolUser.query(updateTimeQuery, [user_id, dateValue, timeValue]);
    res.status(200).send('Logout time recorded successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//verify token
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (typeof token !== 'undefined') {
    jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
        res.sendStatus(403);
      } else {
        req.authData = authData;
        next();
      }
    });
  } else {
    res.sendStatus(403);
  }
}

// Endpoint สำหรับดึงข้อมูล all user user_id, firstname, lastname, company จากตาราง user_data
router.get('/datas', verifyToken, async (req, res) => {
  const selectQuery = 'SELECT user_id, firstname, lastname, company FROM user_data';

  try {
    const result = await poolUser.query(selectQuery);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint สำหรับดึงข้อมูล user logined: user_id, firstname, lastname, company จากตาราง user_data
router.get('/data', verifyToken, async (req, res) => {
  const selectQuery = 'SELECT user_id, firstname, lastname, company FROM user_data WHERE email = $1';
  const values = [req.authData.email];

  try {
    const result = await poolUser.query(selectQuery, values);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

