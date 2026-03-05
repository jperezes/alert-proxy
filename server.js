const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

const WEBEX_API_URL = 'https://webexapis.com/v1/messages';
const WEBEX_TOKEN = process.env.WEBEX_TOKEN;
const WEBEX_ROOM_ID = process.env.WEBEX_ROOM_ID;
const API_TOKEN = process.env.API_TOKEN;

app.use(express.json());

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!API_TOKEN) {
        console.error('API_TOKEN environment variable not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid Authorization format' });
    }

    const providedToken = parts[1];
    const expectedToken = API_TOKEN;

    if (providedToken.length !== expectedToken.length) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const isValid = crypto.timingSafeEqual(
        Buffer.from(providedToken),
        Buffer.from(expectedToken)
    );

    if (!isValid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

app.post('/send-message', authMiddleware, async (req, res) => {
    const message = req.headers['message'];

    if (!message) {
        return res.status(400).json({ 
            error: 'Missing required header: message' 
        });
    }

    if (!WEBEX_TOKEN || !WEBEX_ROOM_ID) {
        console.error('Missing environment variables: WEBEX_TOKEN or WEBEX_ROOM_ID');
        return res.status(500).json({ 
            error: 'Server configuration error' 
        });
    }

    try {
        const response = await fetch(WEBEX_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WEBEX_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                roomId: WEBEX_ROOM_ID,
                text: message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Webex API error:', data);
            return res.status(response.status).json({
                error: 'Webex API error',
                details: data
            });
        }

        return res.status(200).json({
            success: true,
            messageId: data.id
        });

    } catch (error) {
        console.error('Request failed:', error.message);
        return res.status(500).json({ 
            error: 'Failed to send message to Webex' 
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
