// customerAPI.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolCustomer } = require('./db'); // เปลี่ยนจาก dbCustomer เป็น db ตามการรวมไฟล์

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key'; // ควรเก็บเป็นความลับและไม่ควรเขียนตรงนี้ในโค้ดจริง

// ฟังก์ชั่นสำหรับการสร้าง customer_id
async function generateCustomerId() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน (มกราคม = 01)
  const year = String(now.getFullYear()).slice(-2); // ปี (เช่น 2023 = 23)
  const prefix = `${month}${year}`;

  // ค้นหาค่า customer_id ล่าสุดที่มี prefix เดียวกัน
  const query = `
    SELECT customer_id FROM customer_data 
    WHERE customer_id LIKE $1 
    ORDER BY customer_id DESC 
    LIMIT 1
  `;
  const values = [`${prefix}%`];

  const result = await poolCustomer.query(query, values);
  let nextId = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].customer_id;
    const lastSeq = parseInt(lastId.slice(-4), 10);
    nextId = (lastSeq + 1) % 10000; // วนกลับที่ 0001 เมื่อถึง 9999
  }
  const customerId = `${prefix}${String(nextId).padStart(4, '0')}`;
  return customerId;
}

// ฟังก์ชั่นสำหรับการ register
router.post('/register', async (req, res) => {
  const { firstname, lastname, company, address, city, state, country, postal_code, phone, email, password } = req.body;

  if (!firstname || !lastname || !company || !address || !city || !state || !country || !postal_code || !phone || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  const customer_id = await generateCustomerId(); // สร้าง customer_id

  const hashedPassword = await bcrypt.hash(password, 10); // hash รหัสผ่าน

  const now = new Date();
  const dateValue = now.toISOString().split('T')[0]; // แปลงเป็น yyyy-mm-dd
  const timeValue = now.toISOString().split('T')[1].split('.')[0]; // แปลงเป็น hh:mm:ss

  const insertQuery = `
    INSERT INTO customer_data (date, time, customer_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `;
  const values = [dateValue, timeValue, customer_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, hashedPassword];

  try {
    await poolCustomer.query(insertQuery, values);
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// ฟังก์ชั่นสำหรับการ login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and password are required');
  }

  const selectQuery = 'SELECT * FROM customer_data WHERE email = $1';
  
  try {
    const result = await poolCustomer.query(selectQuery, [email]);

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid email or password');
    }

    const user = result.rows[0];
    
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).send('Invalid email or password');
    }

    const token = jwt.sign({ customer_id: user.customer_id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// ฟังก์ชั่นสำหรับการ authentication
router.get('/auth', (req, res) => {
  const token

 = req.headers['authorization'];

  if (!token) {
    return res.status(401).send('Access Denied');
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    res.json(verified);
  } catch (error) {
    console.error(error);
    res.status(400).send('Invalid Token');
  }
});

// ฟังก์ชั่นสำหรับการ recovery data
router.post('/recover', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).send('Email or phone is required');
  }

  let selectQuery = 'SELECT email, phone, password FROM customer_data WHERE ';
  const values = [];

  if (email) {
    selectQuery += 'email = $1';
    values.push(email);
  } else if (phone) {
    selectQuery += 'phone = $1';
    values.push(phone);
  }

  try {
    const result = await poolCustomer.query(selectQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = result.rows[0];
    res.json({ email: user.email, phone: user.phone, password: user.password });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint สำหรับดึงข้อมูล customer_id, firstname, lastname, company จากตาราง customer_data
router.get('/customers', async (req, res) => {
  const selectQuery = 'SELECT customer_id, firstname, lastname, company FROM customer_data';

  try {
    const result = await poolCustomer.query(selectQuery);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;


