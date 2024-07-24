# เลือก Base Image
FROM node:22.5.1

# สร้างโฟลเดอร์สำหรับแอป
WORKDIR /usr/src/app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ลบ node_modules และ package-lock.json หากมีอยู่
RUN rm -rf node_modules package-lock.json

# ติดตั้ง dependencies
RUN npm install

# ติดตั้ง bcrypt ใหม่
RUN npm install bcrypt

# คัดลอกไฟล์ทั้งหมดลงใน image
COPY . .

# เปิดพอร์ตที่ต้องการใช้สำหรับการเชื่อมต่อ
EXPOSE 8080
EXPOSE 3000

# คำสั่งสำหรับเริ่มต้นแอป
CMD ["node", "tcpserver.js"]


