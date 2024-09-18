// controllers/authController.js
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const register = async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password ) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { register, login };