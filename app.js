// app.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/auth');
const endpointRoutes = require('./routes/endpoints');
const dynamicRoutes = require('./routes/dynamic');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);
app.use('/endpoints', endpointRoutes);
app.use('/', dynamicRoutes); // Dynamic routes are handled under /

app.get('/', (req, res) => {
    res.send('Dynamic API Application is running.');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});