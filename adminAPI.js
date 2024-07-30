//adminAPI.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolUser } = require('./db'); // เปลี่ยนจาก dbUser เป็น db ตามการรวมไฟล์
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET2;


// Endpoint สำหรับการลงทะเบียนแอดมิน
router.post('/register', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    const now = new Date();
    const options = { timeZone: 'Asia/Bangkok' };

    const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
    const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

    try {
        // ตรวจสอบว่า email มีอยู่ในฐานข้อมูล user_data หรือไม่
        const selectUserQuery = 'SELECT user_id, email, password, status FROM user_data WHERE email = $1';
        const userResult = await poolUser.query(selectUserQuery, [email]);

        if (userResult.rows.length === 0) {
            return res.status(400).send('Email not found in user_data. Please register the user first.');
        }

        // ดึงข้อมูล user_id, email, password และ status จากฐานข้อมูล user_data
        const { user_id, email: userEmail, password: userPassword, status } = userResult.rows[0];

        // ตรวจสอบว่า status เป็น true หรือไม่
        if (status !== true) {
            return res.status(400).send('User is not approved. Cannot register as admin.');
        }

        // ตรวจสอบว่ามี admin ที่ต้องการลงทะเบียนอยู่แล้วในฐานข้อมูล admin_data หรือไม่
        const checkAdminQuery = 'SELECT * FROM admin_data WHERE email = $1';
        const adminResult = await poolUser.query(checkAdminQuery, [email]);

        if (adminResult.rows.length > 0) {
            return res.status(400).send('Admin with this email already exists');
        }

        // เพิ่มข้อมูลลงในฐานข้อมูล admin_data
        const insertQuery = `
            INSERT INTO admin_data (admin_id, user_id, email, password, status, date_register, time_register)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = ["adminGRB", user_id, userEmail, userPassword, false, dateValue, timeValue];

        await poolUser.query(insertQuery, values);
        res.status(201).send('Admin registered successfully');

    } catch (error) {
        console.error('Error during admin registration:', error);
        res.status(500).send('Internal Server Error');
    }
});


// ฟังก์ชั่นสำหรับการล็อกอินของแอดมิน
router.post('/login', async (req, res) => {
    const { email, password, admin_id } = req.body;

    if (!email || !password || !admin_id) {
        return res.status(400).send('Email, password, and admin_id are required');
    }

    const selectAdminQuery = 'SELECT * FROM admin_data WHERE email = $1 AND admin_id = $2';
    const selectUserQuery = 'SELECT user_id FROM user_data WHERE email = $1';

    try {
        // ตรวจสอบข้อมูลแอดมิน
        const adminResult = await poolUser.query(selectAdminQuery, [email, admin_id]);

        if (adminResult.rows.length > 0) {
            const admin = adminResult.rows[0];

            // ตรวจสอบสถานะของแอดมิน
            if (admin.status !== true) {
                return res.status(401).json({
                    success: false,
                    message: "Login failed. You are not admin!"
                });
            }

            const match = await bcrypt.compare(password, admin.password);
            if (match) {
                const token = jwt.sign({ user_id: admin.user_id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });

                // ค้นหาข้อมูล user_id จาก email
                const userResult = await poolUser.query(selectUserQuery, [email]);
                const user_id = userResult.rows.length > 0 ? userResult.rows[0].user_id : null;

                // บันทึกเวลาล็อกอิน
                const now = new Date();
                const options = { timeZone: 'Asia/Bangkok' };

                const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
                const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

                const insertLogQuery = `
                    INSERT INTO admin_time (admin_id, user_id, date_login, time_login)
                    VALUES ($1, $2, $3, $4)
                `;
                await poolUser.query(insertLogQuery, [admin_id, user_id, dateValue, timeValue]);

                res.json({
                    success: true,
                    message: "Admin login successful",
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
                message: "Login failed. Not found any admin account",
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//verify token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (typeof token !== 'undefined') {
        jwt.verify(token, process.env.JWT_SECRET2, (err, authData) => {
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

// Endpoint สำหรับการล็อกเอาต์
router.post('/logout', verifyToken, async (req, res) => {
    const user_id_from_token = req.authData.user_id; // รับ user_id จาก JWT ใช้ user_id แทนเพราะไม่ซ้ำค่ากัน

    if (!user_id_from_token) {
        return res.status(400).send('User ID is required');
    }

    const now = new Date();
    const options = { timeZone: 'Asia/Bangkok' };

    const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
    const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

    // ใช้คอลัมน์ที่มีอยู่จริงในตาราง
    const updateTimeQuery = `
        WITH latest_entry AS (
            SELECT admin_id, user_id, date_login, time_login
            FROM admin_time
            WHERE user_id = $1 AND date_logout IS NULL AND time_logout IS NULL
            ORDER BY date_login DESC, time_login DESC
            LIMIT 1
        )
        UPDATE admin_time
        SET date_logout = $2, time_logout = $3
        WHERE user_id = (SELECT user_id FROM latest_entry)
          AND date_login = (SELECT date_login FROM latest_entry)
          AND time_login = (SELECT time_login FROM latest_entry)
    `;

    try {
        const result = await poolUser.query(updateTimeQuery, [user_id_from_token, dateValue, timeValue]);

        if (result.rowCount === 0) {
            return res.status(404).send('No active session found for this user');
        }
        res.status(200).send('Logout time recorded successfully');
    } catch (error) {
        console.error('Error recording logout time:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint สำหรับการอัพเดตข้อมูลผู้ใช้
router.put('/user/update', verifyToken, async (req, res) => {
    const { user_id } = req.query;
    const { firstname, lastname, company, address, city, state, country, postal_code, phone, email } = req.body;
    const user_id_from_token = req.authData.user_id;

    if (!user_id || !email) {
        return res.status(400).send('Email or UserID is required');
    }

    // ตรวจสอบข้อมูลที่ส่งมาว่ามีค่าหรือไม่
    if (!firstname || !lastname || !company || !address || !city || !state || !country || !postal_code || !phone || !email) {
        return res.status(400).send('All fields are required');
    }

    // บันทึกเวลาอัพเดท
    const now = new Date();
    const options = { timeZone: 'Asia/Bangkok' };

    const dateValue = now.toLocaleDateString('en-GB', options); // yyyy-mm-dd
    const timeValue = now.toLocaleTimeString('en-GB', options); // hh:mm:ss

    const updateQuery = `
        UPDATE user_data
        SET firstname = $1, lastname = $2, company = $3, address = $4, city = $5, state = $6, country = $7, postal_code = $8, phone = $9, email = $10, date_info_update = $11, time_info_update = $12
        WHERE user_id = $13
    `;
    const values = [firstname, lastname, company, address, city, state, country, postal_code, phone, email, dateValue, timeValue, user_id];

    // ตรวจสอบการมีอยู่ของแอดมิน
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';

    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        // ตรวจสอบการมีอยู่ของผู้ใช้ที่ต้องการอัปเดต
        const selectUserQuery = 'SELECT * FROM user_data WHERE user_id = $1';
        const userResult = await poolUser.query(selectUserQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        // อัปเดตข้อมูลของผู้ใช้
        await poolUser.query(updateQuery, values);
        res.status(200).send('User data updated successfully');
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint สำหรับการลบผู้ใช้
router.delete('/user/delete', verifyToken, async (req, res) => {
    const { user_id, email } = req.query;
    const user_id_from_token = req.authData.user_id;

    // ค้นหา admin ที่มี user_id จาก JWT
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';

    try {
        // ตรวจสอบข้อมูลแอดมิน
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        // ค้นหาผู้ใช้จาก user_data
        const selectUserQuery = 'SELECT * FROM user_data WHERE user_id = $1 OR email = $2';
        const userResult = await poolUser.query(selectUserQuery, [user_id, email]);

        // ค้นหาผู้ใช้จาก admin_data
        const selectUserAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1 OR email = $2';
        const userAdminResult = await poolUser.query(selectUserAdminQuery, [user_id, email]);

        // ตรวจสอบว่ามีผู้ใช้ใน user_data หรือไม่
        if (userResult.rows.length > 0) {
            // ลบผู้ใช้จากฐานข้อมูล user_data
            const deleteUserQuery = 'DELETE FROM user_data WHERE user_id = $1 OR email = $2';
            await poolUser.query(deleteUserQuery, [user_id, email]);
        }

        // ตรวจสอบว่ามีผู้ใช้ใน admin_data หรือไม่
        if (userAdminResult.rows.length > 0) {
            // ลบผู้ใช้จากฐานข้อมูล admin_data
            const deleteAdminUserQuery = 'DELETE FROM admin_data WHERE user_id = $1 OR email = $2';
            await poolUser.query(deleteAdminUserQuery, [user_id, email]);
        }

        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Endpoint สำหรับการลบผู้ใช้ ออกจาก admin
router.delete('/admin/delete', verifyToken, async (req, res) => {
    const { user_id, email } = req.query;
    const user_id_from_token = req.authData.user_id;

    // สร้างเงื่อนไขการค้นหา
    let query = 'SELECT user_id, email FROM admin_data WHERE 1=1'; // 1=1 เป็นเงื่อนไขที่ใช้สำหรับการต่อเงื่อนไขที่เพิ่มเข้ามา
    let values = [];
    let index = 1;

    if (user_id) {
        query += ` AND user_id = $${index++}`;
        values.push(user_id);
    }
    if (email) {
        query += ` AND email = $${index++}`;
        values.push(email);
    }

    // ค้นหา admin ที่มี user_id จาก JWT
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';

    try {
        // ตรวจสอบข้อมูลแอดมิน
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('This user not found in admin or not authorized');
        }

        // ค้นหาผู้ใช้จาก email จาก admin_data
        const selectUserAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1 OR email = $2';
        const userAdminResult = await poolUser.query(selectUserAdminQuery, [user_id, email]);

        if (userAdminResult.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        // ลบผู้ใช้จากฐานข้อมูล admin_data
        const deleteAdminQuery = 'DELETE FROM admin_data WHERE user_id = $1 OR email = $2';
        const deleteAdminResult = await poolUser.query(deleteAdminQuery, [user_id, email]);

        if (deleteAdminResult.rowCount === 0) {
            return res.status(404).send('Failed to Delete User from Admin Account');
        }

        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint สำหรับการอัปเดตสถานะของผู้ใช้ในตาราง user_data
router.put('/user/status', verifyToken, async (req, res) => {
    const { user_id, email } = req.query;
    const { status } = req.body;
    const user_id_from_token = req.authData.user_id; // ใช้ user_id จาก JWT

    // สร้างเงื่อนไขการค้นหา
    let query = 'SELECT user_id, email FROM user_data WHERE 1=1'; // 1=1 เป็นเงื่อนไขที่ใช้สำหรับการต่อเงื่อนไขที่เพิ่มเข้ามา
    let values = [];
    let index = 1;

    if (user_id) {
        query += ` AND user_id = $${index++}`;
        values.push(user_id);
    }
    if (email) {
        query += ` AND email = $${index++}`;
        values.push(email);
    }

    if (status === undefined) {
        return res.status(400).send('Status are required');
    }

    // ตรวจสอบการมีอยู่ของแอดมิน
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';
    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        // ตรวจสอบการมีอยู่ของผู้ใช้
        const userResult = await poolUser.query(query, values);

        if (userResult.rows.length === 0) {
            return res.status(404).send('No users found matching the criteria. User not found');
        }

        // อัปเดตสถานะของผู้ใช้
        const updateStatusQuery = 'UPDATE user_data SET status = $1 WHERE email = $2 OR user_id = $3';
        const result = await poolUser.query(updateStatusQuery, [status, email, user_id]);

        if (result.rowCount === 0) {
            return res.status(404).send('User not found or status update failed');
        }

        res.status(200).send('User status updated successfully');
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint สำหรับการอัปเดตสถานะของแอดมินในตาราง admin_data
router.put('/admin/status', verifyToken, async (req, res) => {
    const { user_id, email } = req.query;
    const { status, ref_email } = req.body;
    const user_id_from_token = req.authData.user_id; // ใช้ user_id จาก JWT

    // สร้างเงื่อนไขการค้นหา
    let query = 'SELECT user_id, email FROM admin_data WHERE 1=1'; // 1=1 เป็นเงื่อนไขที่ใช้สำหรับการต่อเงื่อนไขที่เพิ่มเข้ามา
    let values = [];
    let index = 1;

    if (user_id) {
        query += ` AND user_id = $${index++}`;
        values.push(user_id);
    }
    if (email) {
        query += ` AND email = $${index++}`;
        values.push(email);
    }

    if (status === undefined || !ref_email) {
        return res.status(400).send('Status and Referrence Email are required');
    }

    // ตรวจสอบการมีอยู่ของแอดมินที่ดำเนินการ
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';
    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);
        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        // ตรวจสอบการมีอยู่ของผู้ใช้ที่สมัครแอดมิน
        const userResult = await poolUser.query(query, values);

        if (userResult.rows.length === 0) {
            return res.status(404).send('No users found matching the criteria. User not found');
        }

        // ตรวจสอบสถานะของ ref_email
        const selectRefAdminQuery = 'SELECT status FROM admin_data WHERE email = $1';
        const refAdminResult = await poolUser.query(selectRefAdminQuery, [ref_email]);

        if (refAdminResult.rows.length === 0) {
            return res.status(404).send('Email reference is not admin');
        }

        const { status: refStatus } = refAdminResult.rows[0];

        // ตรวจสอบว่าสถานะของ ref_email เป็น true หรือไม่
        if (!refStatus) {
            return res.status(403).send('Reference admin status is not approved');
        }

        // อัปเดตสถานะของผู้ใช้
        const updateStatusQuery = 'UPDATE admin_data SET status = $1, ref_email = $2 WHERE email = $3 OR user_id = $4';
        const result = await poolUser.query(updateStatusQuery, [status, ref_email, email, user_id]);

        if (result.rowCount === 0) {
            return res.status(404).send('User not found or status update failed');
        }

        res.status(200).send('User status updated successfully');
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint สำหรับการ Fetch ข้อมูลของ User โดยระบุค่าใดค่าหนึ่ง
router.get('/user/fetch', verifyToken, async (req, res) => {
    const { date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, status, date_info_update, time_info_update } = req.query;
    const user_id_from_token = req.authData.user_id; // ใช้ user_id จาก JWT

    // สร้างเงื่อนไขการค้นหา
    let query = 'SELECT date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, status, date_info_update, time_info_update FROM user_data WHERE 1=1'; // 1=1 เป็นเงื่อนไขที่ใช้สำหรับการต่อเงื่อนไขที่เพิ่มเข้ามา
    let values = [];
    let index = 1;

    if (date) {
        query += ` AND date = $${index++}`;
        values.push(date);
    }
    if (time) {
        query += ` AND time = $${index++}`;
        values.push(time);
    }
    if (user_id) {
        query += ` AND user_id = $${index++}`;
        values.push(user_id);
    }
    if (firstname) {
        query += ` AND firstname = $${index++}`;
        values.push(firstname);
    }
    if (lastname) {
        query += ` AND lastname = $${index++}`;
        values.push(lastname);
    }
    if (company) {
        query += ` AND company = $${index++}`;
        values.push(company);
    }
    if (address) {
        query += ` AND address = $${index++}`;
        values.push(address);
    }
    if (city) {
        query += ` AND city = $${index++}`;
        values.push(city);
    }
    if (state) {
        query += ` AND state = $${index++}`;
        values.push(state);
    }
    if (country) {
        query += ` AND country = $${index++}`;
        values.push(country);
    }
    if (postal_code) {
        query += ` AND postal_code = $${index++}`;
        values.push(postal_code);
    }
    if (phone) {
        query += ` AND phone = $${index++}`;
        values.push(phone);
    }
    if (email) {
        query += ` AND email = $${index++}`;
        values.push(email);
    }
    if (status) {
        query += ` AND status = $${index++}`;
        values.push(status);
    }
    if (date_info_update) {
        query += ` AND date_info_update = $${index++}`;
        values.push(date_info_update);
    }
    if (time_info_update) {
        query += ` AND time_info_update = $${index++}`;
        values.push(time_info_update);
    }

    // ตรวจสอบการมีอยู่ของแอดมิน
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';
    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        const result = await poolUser.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).send('No users found matching the criteria');
        }

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint สำหรับการ Fetch ข้อมูลของ admin โดยระบุค่าใดค่าหนึ่ง
router.get('/admin/fetch', verifyToken, async (req, res) => {
    const { date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, status, date_info_update, time_info_update } = req.query;
    const user_id_from_token = req.authData.user_id; // ใช้ user_id จาก JWT

    // สร้างเงื่อนไขการค้นหา
    let query = 'SELECT date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, status, date_info_update, time_info_update FROM user_data WHERE 1=1'; // 1=1 เป็นเงื่อนไขที่ใช้สำหรับการต่อเงื่อนไขที่เพิ่มเข้ามา
    let values = [];
    let index = 1;

    if (date) {
        query += ` AND date = $${index++}`;
        values.push(date);
    }
    if (time) {
        query += ` AND time = $${index++}`;
        values.push(time);
    }
    if (user_id) {
        query += ` AND user_id = $${index++}`;
        values.push(user_id);
    }
    if (firstname) {
        query += ` AND firstname = $${index++}`;
        values.push(firstname);
    }
    if (lastname) {
        query += ` AND lastname = $${index++}`;
        values.push(lastname);
    }
    if (company) {
        query += ` AND company = $${index++}`;
        values.push(company);
    }
    if (address) {
        query += ` AND address = $${index++}`;
        values.push(address);
    }
    if (city) {
        query += ` AND city = $${index++}`;
        values.push(city);
    }
    if (state) {
        query += ` AND state = $${index++}`;
        values.push(state);
    }
    if (country) {
        query += ` AND country = $${index++}`;
        values.push(country);
    }
    if (postal_code) {
        query += ` AND postal_code = $${index++}`;
        values.push(postal_code);
    }
    if (phone) {
        query += ` AND phone = $${index++}`;
        values.push(phone);
    }
    if (email) {
        query += ` AND email = $${index++}`;
        values.push(email);
    }
    if (status) {
        query += ` AND status = $${index++}`;
        values.push(status);
    }
    if (date_info_update) {
        query += ` AND date_info_update = $${index++}`;
        values.push(date_info_update);
    }
    if (time_info_update) {
        query += ` AND time_info_update = $${index++}`;
        values.push(time_info_update);
    }

    // ตรวจสอบการมีอยู่ของแอดมิน
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';
    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        const userResult = await poolUser.query(query, values);

        if (userResult.rows.length === 0) {
            return res.status(404).send('No users found matching the criteria');
        } else {
            const user_ids = userResult.rows.map(user => user.user_id); // ดึง user_id จากผลลัพธ์

            // ค้นหาในตาราง admin_data ด้วย user_id ที่ได้จาก user_data
            const selectUserAdminQuery = `
                SELECT admin_id, user_id, email, status, date_register, time_register, ref_email
                FROM admin_data
                WHERE user_id::text = ANY($1::text[])
            `;
            const adminUserResult = await poolUser.query(selectUserAdminQuery, [user_ids]);

            if (adminUserResult.rows.length === 0) {
                return res.status(404).send('This user account not found matching the criteria');
            } else {
                res.status(200).json(adminUserResult.rows);
            }
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint สำหรับการ Fetch ข้อมูลของ User โดยระบุค่า user_id หรือ email
router.get('/user/details', verifyToken, async (req, res) => {
    const { user_id, email } = req.query;
    const user_id_from_token = req.authData.user_id; // ใช้ user_id จาก JWT

    if (!user_id && !email) {
        return res.status(400).send('Either user_id or email is required');
    }

    let query = 'SELECT date, time, user_id, firstname, lastname, company, address, city, state, country, postal_code, phone, email, status, date_info_update, time_info_update FROM user_data WHERE';
    let values = [];
    let index = 1;

    if (user_id) {
        query += ` user_id = $${index++}`;
        values.push(user_id);
    }
    if (email) {
        if (user_id) {
            query += ' OR';
        }
        query += ` email = $${index++}`;
        values.push(email);
    }

    // ตรวจสอบการมีอยู่ของแอดมิน
    const selectAdminQuery = 'SELECT * FROM admin_data WHERE user_id = $1';

    try {
        const adminResult = await poolUser.query(selectAdminQuery, [user_id_from_token]);

        if (adminResult.rows.length === 0) {
            return res.status(403).send('Admin not found or not authorized');
        }

        const result = await poolUser.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).send('No user found matching the criteria');
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;
