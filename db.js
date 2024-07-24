const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Pool สำหรับฐานข้อมูล customer
const poolUser = new Pool({
  user: process.env.DB_USER, // ผู้ใช้ที่เชื่อมต่อ
  host: process.env.DB_HOST, // ที่อยู่ IP ของ instance
  database: process.env.DB_NAME_USER, // ชื่อฐานข้อมูล
  password: process.env.DB_PASS, // รหัสผ่านของผู้ใช้
  port: process.env.DB_PORT, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

// Pool สำหรับฐานข้อมูล tracking
const poolTracking = new Pool({
  user: process.env.DB_USER, // ผู้ใช้ที่เชื่อมต่อ
  host: process.env.DB_HOST, // ที่อยู่ IP ของ instance
  database: process.env.DB_NAME_TRACKING, // ชื่อฐานข้อมูล
  password: process.env.DB_PASS, // รหัสผ่านของผู้ใช้
  port: process.env.DB_PORT, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

module.exports = {
  poolUser, // ส่งออก poolCustomer สำหรับ customer
  poolTracking, // ส่งออก poolTracking สำหรับ tracking
};
