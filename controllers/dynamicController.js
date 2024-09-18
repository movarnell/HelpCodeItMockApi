// controllers/dynamicController.js
const pool = require('../db');

// Utility function for basic data type validation
const validateDataType = (value, data_type) => {
    switch (data_type.toUpperCase()) {
        case 'INT':
            return Number.isInteger(Number(value));
        case 'FLOAT':
            return !isNaN(parseFloat(value));
        case 'VARCHAR':
        case 'TEXT':
            return typeof value === 'string';
        case 'BOOLEAN':
            return value === 'true' || value === 'false' || typeof value === 'boolean';
        case 'DATE':
        case 'DATETIME':
            return !isNaN(Date.parse(value));
        default:
            return false;
    }
};

// Main handler for dynamic requests
const handleRequest = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_name = req.params.endpoint_name;
    const http_method = req.method.toUpperCase();

    console.log('Endpoint Name:', endpoint_name);
    console.log('HTTP Method:', http_method);
    console.log('User ID:', user_id);

    try {
        // Fetch the endpoint configuration
        const [endpoints] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE endpoint_name = ? AND user_id = ?',
            [endpoint_name, user_id]
        );

        console.log('Endpoints Found:', endpoints.length);

        if (endpoints.length === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        const endpoint = endpoints[0];

        // Fetch the fields for this endpoint
        const [fields] = await pool.execute(
            'SELECT * FROM fields WHERE endpoint_id = ?',
            [endpoint.endpoint_id]
        );

        // Determine which operation to perform based on HTTP method
        switch (http_method) {
            case 'GET':
                await handleRead(req, res, endpoint.endpoint_id, fields);
                break;
            case 'POST':
                await handleCreate(req, res, endpoint.endpoint_id, fields);
                break;
            case 'PUT':
                await handleUpdate(req, res, endpoint.endpoint_id, fields);
                break;
            case 'DELETE':
                await handleDelete(req, res, endpoint.endpoint_id, fields);
                break;
            default:
                res.status(405).json({ message: 'Method Not Allowed' });
                break;
        }
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Handle CREATE (POST) requests
const handleCreate = async (req, res, endpoint_id, fields) => {
    const data = req.body;
    const jsonData = {};

    // Validate required fields and data types
    for (const field of fields) {
        const { field_name, data_type, is_required, default_value } = field;
        let value = data[field_name];

        if (is_required && (value === undefined || value === null || value === '')) {
            return res.status(400).json({ message: `Field '${field_name}' is required.` });
        }

        if (value !== undefined && value !== null && value !== '') {
            // Basic data type validation
            if (!validateDataType(value, data_type)) {
                return res.status(400).json({ message: `Invalid data type for field '${field_name}'. Expected ${data_type}.` });
            }
            jsonData[field_name] = value;
        } else if (default_value !== null) {
            jsonData[field_name] = default_value;
        }
    }

    try {
        await pool.execute(
            'INSERT INTO data_storage (endpoint_id, data) VALUES (?, ?)',
            [endpoint_id, JSON.stringify(jsonData)]
        );

        res.status(201).json({ message: 'Data created successfully.' });
    } catch (err) {
        console.error('Error in handleCreate:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Handle READ (GET) requests
const handleRead = async (req, res, endpoint_id, fields) => {
    try {
        // Fetch data_id and data from data_storage
        const [rows] = await pool.execute(
            'SELECT data_id, data FROM data_storage WHERE endpoint_id = ?',
            [endpoint_id]
        );

        // Map the results to include data_id alongside parsed data
        const data = rows.map(row => {
            const parsedData = JSON.parse(row.data);
            return { data_id: row.data_id, ...parsedData };
        });

        res.json(data);
    } catch (err) {
        console.error('Error in handleRead:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Handle UPDATE (PUT) requests
const handleUpdate = async (req, res, endpoint_id, fields) => {
    const data = req.body;
    const identifier = req.query.id; // Assuming data_id is passed as a query parameter

    if (!identifier) {
        return res.status(400).json({ message: 'Data ID is required for update.' });
    }

    // Fetch existing data
    const [existingRows] = await pool.execute(
        'SELECT data FROM data_storage WHERE data_id = ? AND endpoint_id = ?',
        [identifier, endpoint_id]
    );

    if (existingRows.length === 0) {
        return res.status(404).json({ message: 'Data not found.' });
    }

    const existingData = JSON.parse(existingRows[0].data);

    // Update data with new values
    for (const field of fields) {
        const { field_name, data_type, is_required, default_value } = field;
        if (data[field_name] !== undefined) {
            const value = data[field_name];
            if (!validateDataType(value, data_type)) {
                return res.status(400).json({ message: `Invalid data type for field '${field_name}'. Expected ${data_type}.` });
            }
            existingData[field_name] = value;
        }
    }

    try {
        await pool.execute(
            'UPDATE data_storage SET data = ? WHERE data_id = ? AND endpoint_id = ?',
            [JSON.stringify(existingData), identifier, endpoint_id]
        );

        res.json({ message: 'Data updated successfully.' });
    } catch (err) {
        console.error('Error in handleUpdate:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Handle DELETE (DELETE) requests
const handleDelete = async (req, res, endpoint_id, fields) => {
    const identifier = req.query.id; // Retrieve 'id' from query parameters

    console.log(`Received DELETE request with id: ${identifier}`); // Debugging line

    if (!identifier) {
        return res.status(400).json({ message: 'Data ID is required for deletion.' });
    }

    try {
        const [result] = await pool.execute(
            'DELETE FROM data_storage WHERE data_id = ? AND endpoint_id = ?',
            [identifier, endpoint_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Data not found.' });
        }

        res.json({ message: 'Data deleted successfully.' });
    } catch (err) {
        console.error('Error in handleDelete:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { handleRequest };