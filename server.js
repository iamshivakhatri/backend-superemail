// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.js');
const { trackEmailOpen } = require('./controllers/emailController');
const compression = require('compression');

const app = express();

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:3001', // Replace with your frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Add this middleware to log incoming requests
app.use((req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.use(express.json());

// Add this new route handler before your other route definitions
app.get('/', (req, res) => {
    res.send('Welcome to the Email Tracking API');
});

// Pass corsOptions to authRoutes
app.use('/auth', authRoutes(corsOptions));

// Add CORS for tracking pixel
app.use('/auth/track', cors(corsOptions));

// Add compression middleware
app.use(compression());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Move these routes to the end of the file
app.get('/auth/track/:trackingId', cors(corsOptions), trackEmailOpen);
app.post('/auth/track/:trackingId', cors(corsOptions), trackEmailOpen);

// Add this before your routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
