const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const port = 3000;

const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'crypto_db',
    password: 'your_password',
    port: 5432,
});

// Fetch data from WazirX API and store in PostgreSQL
const fetchDataAndStore = async () => {
    try {
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
        const tickers = response.data;

        // Extract top 10 tickers
        const top10Tickers = Object.values(tickers).slice(0, 10);

        // Store in PostgreSQL database
        const client = await pool.connect();
        top10Tickers.forEach(async (ticker) => {
            const { name, last, buy, sell, volume, base_unit } = ticker;
            await client.query(
                'INSERT INTO crypto_prices (name, last, buy, sell, volume, base_unit) VALUES ($1, $2, $3, $4, $5, $6)',
                [name, last, buy, sell, volume, base_unit]
            );
        });
        client.release();
    } catch (error) {
        console.error('Error fetching and storing data:', error);
    }
};

// Endpoint to fetch data from database
app.get('/api/crypto', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM crypto_prices');
        res.json(result.rows);
        client.release();
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Schedule fetching and storing data every 5 minutes
fetchDataAndStore();
setInterval(fetchDataAndStore, 300000); // 5 minutes

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
