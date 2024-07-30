//server.js
const express = require('express');
const cors = require('cors');
const { poolUser, poolTracking } = require('./db'); // Import pools from db.js
const userAPI = require('./userAPI'); // Import userAPI
const adminAPI = require('./adminAPI'); // Import adminAPI
const trackingAPI = require('./trackingAPI'); // Import trackingAPI

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Middleware สำหรับเชื่อมต่อฐานข้อมูลใน userAPI และ trackingAPI
app.use((req, res, next) => {
  req.poolUser = poolUser;
  req.poolTracking = poolTracking;
  next();
});

app.use('/api/users', userAPI); // ใช้ userAPI ที่ endpoint /api/users
app.use('/api/admin', adminAPI); // ใช้ adminAPI ที่ endpoint /api/admin
app.use('/api/tracking', trackingAPI); // ใช้ trackingAPI ที่ endpoint /api/tracking

// เริ่ม server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


