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