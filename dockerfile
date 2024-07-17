# เลือก Base Image
FROM node:latest

# สร้างโฟลเดอร์สำหรับแอป
WORKDIR /usr/src/app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกไฟล์ทั้งหมดลงใน image
COPY . .

# เปิดพอร์ตที่ต้องการใช้สำหรับการเชื่อมต่อ
EXPOSE 8080

# คำสั่งสำหรับเริ่มต้นแอป
CMD ["node", "tcpServer.js"]
