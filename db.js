// db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Pool สำหรับฐานข้อมูล customer
const poolCustomer = new Pool({
  user: process.env.DB_USER, // ผู้ใช้ที่เชื่อมต่อ
  host: process.env.DB_HOST, // ที่อยู่ IP ของ instance
  database: DB_NAME_CUSTOMER, // ชื่อฐานข้อมูล
  password: DB_PASS, // รหัสผ่านของผู้ใช้
  port: DB_PASS, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: DB_IDLE_TIMEOUT, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: DB_CONNECTTION_TIMEOUT, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

// Pool สำหรับฐานข้อมูล tracking
const poolTracking = new Pool({
  user: process.env.DB_USER, // ผู้ใช้ที่เชื่อมต่อ
  host: process.env.DB_HOST, // ที่อยู่ IP ของ instance
  database: DB_NAME_TRACKING, // ชื่อฐานข้อมูล
  password: DB_PASS, // รหัสผ่านของผู้ใช้
  port: DB_PASS, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: DB_IDLE_TIMEOUT, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: DB_CONNECTTION_TIMEOUT, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

module.exports = {
  poolCustomer, // ส่งออก poolCustomer สำหรับ customer
  poolTracking, // ส่งออก poolTracking สำหรับ tracking
};