const net = require('net');
const { handleTcpData } = require('./tcpDataHandler');

// สร้างเซิร์ฟเวอร์ TCP
const server = net.createServer((socket) => {
  console.log('Client connected');

  // กำหนด encoding สำหรับการรับข้อมูลเป็น string
  socket.setEncoding('utf8');

  // ฟังก์ชันที่รับข้อมูลจาก client
  socket.on('data', async (data) => {
    console.log('Received hex data:', data);

    try {
      // ส่งข้อมูล hex ที่รับมาจาก client ไปที่ handleTcpData
      await handleTcpData(data);
    } catch (err) {
      console.error('Error handling TCP data:', err);
    }
  });

  // ฟังก์ชันที่ทำงานเมื่อ client ตัดการเชื่อมต่อ
  socket.on('end', () => {
    console.log('Client disconnected');
  });

  // ฟังก์ชันที่ทำงานเมื่อเกิดข้อผิดพลาด
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// กำหนด IP address และพอร์ตที่เซิร์ฟเวอร์จะฟังการเชื่อมต่อ
const HOST = '0.0.0.0'; // IP address ที่ต้องการให้เซิร์ฟเวอร์เชื่อมต่อ
const PORT = 8080;
server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});

