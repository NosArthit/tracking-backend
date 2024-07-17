const express = require('express');
const { poolTracking } = require('./db'); // Import the poolTracking from db.js

const router = express.Router();

// Endpoint to fetch data from the extended_data table
router.get('/extended_data', async (req, res) => {
  try {
    const result = await poolTracking.query('SELECT * FROM extended_data');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong!');
  }
});

// Endpoint to fetch data from a dynamically specified table
router.get('/fetch_data', async (req, res) => {
  const { table, columns, condition } = req.query;

  // Check if table, columns, and condition are provided
  if (!table || !columns || !condition) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // Construct SQL query based on the received data
    const query = `SELECT ${columns} FROM ${table} WHERE ${condition}`;
    const result = await poolTracking.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Endpoint to fetch data from the extended_data table for a specific IMEI with the latest date_server and time_server
router.get('/latest_data', async (req, res) => {
  const imei = req.query.imei;

  if (!imei) {
    return res.status(400).json({ error: 'Missing imei parameter' });
  }

  try {
    const query = `
      SELECT *
      FROM extended_data
      WHERE imei = $1
      ORDER BY date_server DESC, time_server DESC
      LIMIT 1
    `;
    const result = await poolTracking.query(query, [imei]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified imei' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Endpoint to fetch data from the extended_data table for a specific IMEI within a date range
router.get('/data_by_date_range', async (req, res) => {
  const { imei, startDate, endDate } = req.query;

  if (!imei || !startDate || !endDate) {
    return res.status(400).send('IMEI, startDate, and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const maxDaysAgo = new Date();
  maxDaysAgo.setDate(today.getDate() - 60);

  if (end - start > 45 * 24 * 60 * 60 * 1000) {
    return res.status(400).send('The date range should not exceed 45 days');
  }

  if (start < maxDaysAgo) {
    return res.status(400).send('You can only query data up to 60 days ago');
  }

  const query = `
    SELECT * FROM extended_data 
    WHERE imei = $1 
    AND date_server BETWEEN $2 AND $3
    ORDER BY date_server DESC, time_server DESC
  `;

  try {
    const result = await poolTracking.query(query, [imei, start.toISOString(), end.toISOString()]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

