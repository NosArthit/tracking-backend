// server.js
const express = require('express');
const cors = require('cors');
const { poolCustomer, poolTracking } = require('./db'); // Import pools from db.js
const customerAPI = require('./customerAPI'); // Import customerAPI
const trackingAPI = require('./trackingAPI'); // Import trackingAPI

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Middleware สำหรับเชื่อมต่อฐานข้อมูลใน customerAPI และ trackingAPI
app.use((req, res, next) => {
  req.poolCustomer = poolCustomer;
  req.poolTracking = poolTracking;
  next();
});

app.use('/api/customers', customerAPI); // ใช้ customerAPI ที่ endpoint /api/customers
app.use('/api/tracking', trackingAPI); // ใช้ trackingAPI ที่ endpoint /api/tracking

// เริ่ม server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


