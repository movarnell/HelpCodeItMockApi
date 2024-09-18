// controllers/endpointController.js
const pool = require('../db');

// Create a new API endpoint
const createEndpoint = async (req, res) => {
    const { endpoint_name, http_method } = req.body;
    const user_id = req.user.user_id;

    if (!endpoint_name || !http_method) {
        return res.status(400).json({ message: 'Endpoint name and HTTP method are required.' });
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (!validMethods.includes(http_method.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid HTTP method.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO api_endpoints (user_id, endpoint_name, http_method) VALUES (?, ?, ?)',
            [user_id, endpoint_name, http_method.toUpperCase()]
        );

        res.status(201).json({ endpoint_id: result.insertId, message: 'API endpoint created successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Endpoint name already exists.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all API endpoints for the user
const getEndpoints = async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE user_id = ?',
            [user_id]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get a specific API endpoint by ID
const getEndpointById = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE endpoint_id = ? AND user_id = ?',
            [endpoint_id, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Update an API endpoint
const updateEndpoint = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;
    const { endpoint_name, http_method } = req.body;

    if (!endpoint_name && !http_method) {
        return res.status(400).json({ message: 'At least one field (endpoint_name or http_method) is required.' });
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (http_method && !validMethods.includes(http_method.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid HTTP method.' });
    }

    try {
        // Check if endpoint exists
        const [existing] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE endpoint_id = ? AND user_id = ?',
            [endpoint_id, user_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        // Build dynamic query
        let query = 'UPDATE api_endpoints SET ';
        const params = [];
        if (endpoint_name) {
            query += 'endpoint_name = ?, ';
            params.push(endpoint_name);
        }
        if (http_method) {
            query += 'http_method = ?, ';
            params.push(http_method.toUpperCase());
        }
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ' WHERE endpoint_id = ? AND user_id = ?';
        params.push(endpoint_id, user_id);

        await pool.execute(query, params);

        res.json({ message: 'API endpoint updated successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Endpoint name already exists.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Delete an API endpoint
const deleteEndpoint = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;

    try {
        const [result] = await pool.execute(
            'DELETE FROM api_endpoints WHERE endpoint_id = ? AND user_id = ?',
            [endpoint_id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        res.json({ message: 'API endpoint deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Add fields to an API endpoint
const addFields = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;
    const fields = req.body.fields; // Expecting an array of field objects

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: 'Fields are required and should be an array.' });
    }

    // Validate fields
    const validDataTypes = ['INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'BOOLEAN', 'FLOAT'];
    for (const field of fields) {
        const { field_name, data_type, is_required, default_value } = field;
        if (!field_name || !data_type) {
            return res.status(400).json({ message: 'Each field must have a field_name and data_type.' });
        }
        if (!validDataTypes.includes(data_type.toUpperCase())) {
            return res.status(400).json({ message: `Invalid data type for field ${field_name}.` });
        }
    }

    try {
        // Verify the endpoint belongs to the user
        const [existing] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE endpoint_id = ? AND user_id = ?',
            [endpoint_id, user_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        // Insert fields
        const insertPromises = fields.map(field => {
            const { field_name, data_type, is_required = false, default_value = null } = field;
            return pool.execute(
                'INSERT INTO fields (endpoint_id, field_name, data_type, is_required, default_value) VALUES (?, ?, ?, ?, ?)',
                [endpoint_id, field_name, data_type.toUpperCase(), is_required, default_value]
            );
        });

        await Promise.all(insertPromises);

        res.status(201).json({ message: 'Fields added successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'One or more field names already exist for this endpoint.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all fields for an API endpoint
const getFields = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;

    try {
        // Verify the endpoint belongs to the user
        const [endpoint] = await pool.execute(
            'SELECT * FROM api_endpoints WHERE endpoint_id = ? AND user_id = ?',
            [endpoint_id, user_id]
        );

        if (endpoint.length === 0) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }

        const [fields] = await pool.execute(
            'SELECT * FROM fields WHERE endpoint_id = ?',
            [endpoint_id]
        );

        res.json(fields);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Update a field
const updateField = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;
    const field_id = req.params.fieldId;
    const { field_name, data_type, is_required, default_value } = req.body;

    if (!field_name && !data_type && is_required === undefined && default_value === undefined) {
        return res.status(400).json({ message: 'At least one field to update is required.' });
    }

    const validDataTypes = ['INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'BOOLEAN', 'FLOAT'];
    if (data_type && !validDataTypes.includes(data_type.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid data type.' });
    }

    try {
        // Verify the endpoint and field belong to the user
        const [field] = await pool.execute(
            `SELECT fe.* FROM fields fe
             JOIN api_endpoints ae ON fe.endpoint_id = ae.endpoint_id
             WHERE fe.field_id = ? AND ae.endpoint_id = ? AND ae.user_id = ?`,
            [field_id, endpoint_id, user_id]
        );

        if (field.length === 0) {
            return res.status(404).json({ message: 'Field not found.' });
        }

        // Build dynamic query
        let query = 'UPDATE fields SET ';
        const params = [];
        if (field_name) {
            query += 'field_name = ?, ';
            params.push(field_name);
        }
        if (data_type) {
            query += 'data_type = ?, ';
            params.push(data_type.toUpperCase());
        }
        if (is_required !== undefined) {
            query += 'is_required = ?, ';
            params.push(is_required);
        }
        if (default_value !== undefined) {
            query += 'default_value = ?, ';
            params.push(default_value);
        }
        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ' WHERE field_id = ?';
        params.push(field_id);

        await pool.execute(query, params);

        res.json({ message: 'Field updated successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Field name already exists for this endpoint.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Delete a field
const deleteField = async (req, res) => {
    const user_id = req.user.user_id;
    const endpoint_id = req.params.id;
    const field_id = req.params.fieldId;

    try {
        // Verify the endpoint and field belong to the user
        const [field] = await pool.execute(
            `SELECT fe.* FROM fields fe
             JOIN api_endpoints ae ON fe.endpoint_id = ae.endpoint_id
             WHERE fe.field_id = ? AND ae.endpoint_id = ? AND ae.user_id = ?`,
            [field_id, endpoint_id, user_id]
        );

        if (field.length === 0) {
            return res.status(404).json({ message: 'Field not found.' });
        }

        await pool.execute(
            'DELETE FROM fields WHERE field_id = ?',
            [field_id]
        );

        res.json({ message: 'Field deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {
    createEndpoint,
    getEndpoints,
    getEndpointById,
    updateEndpoint,
    deleteEndpoint,
    addFields,
    getFields,
    updateField,
    deleteField
};