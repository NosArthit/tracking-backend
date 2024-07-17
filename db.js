// db.js
const { Pool } = require('pg');

// Pool สำหรับฐานข้อมูล customer
const poolCustomer = new Pool({
  user: 'postgres', // ผู้ใช้ที่เชื่อมต่อ
  host: '34.124.148.59', // ที่อยู่ IP ของ instance
  database: 'customer', // ชื่อฐานข้อมูล
  password: '0929854224', // รหัสผ่านของผู้ใช้
  port: 5432, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: 30000, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: 2000, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

// Pool สำหรับฐานข้อมูล tracking
const poolTracking = new Pool({
  user: 'postgres', // ผู้ใช้ที่เชื่อมต่อ
  host: '34.124.148.59', // ที่อยู่ IP ของ instance
  database: 'tracking', // ชื่อฐานข้อมูล
  password: '0929854224', // รหัสผ่านของผู้ใช้
  port: 5432, // พอร์ตของ PostgreSQL
  idleTimeoutMillis: 30000, // ใช้งานในระยะเวลาที่ไม่มีคำขอ
  connectionTimeoutMillis: 2000, // ใช้งานในระยะเวลาการเชื่อมต่อ
});

module.exports = {
  poolCustomer, // ส่งออก poolCustomer สำหรับ customer
  poolTracking, // ส่งออก poolTracking สำหรับ tracking
};