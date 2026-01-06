const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

let lastPing = null;
let isRunning = true;

// Homepage with status
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🤖 Discord Bot Status</title>
        <meta http-equiv="refresh" content="30">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
                backdrop-filter: blur(10px);
            }
            .status { 
                color: #4ade80; 
                font-size: 32px; 
                margin: 20px;
                font-weight: bold;
            }
            .info { 
                font-size: 18px; 
                margin: 15px 0;
                opacity: 0.9;
            }
            .ping-time { 
                color: #fbbf24; 
                font-size: 16px; 
                margin-top: 30px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
            }
            h1 { margin: 0 0 20px 0; font-size: 48px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Discord Execution Bot</h1>
            <div class="status">✅ Online and Monitoring</div>
            <p class="info">Auto-pinging every 5 minutes to stay awake</p>
            <p class="info">discord.gg/locx</p>
            <div class="ping-time" id="pingTime">Last ping: ${lastPing || 'Starting...'}</div>
        </div>
        <script>
            setInterval(() => location.reload(), 60000);
        </script>
    </body>
    </html>
  `);
});

// Ping endpoint
app.get('/ping', (req, res) => {
  const now = new Date().toLocaleTimeString();
  lastPing = now;
  res.json({ status: 'alive', timestamp: Date.now(), lastPing: now });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'discord-execution-bot',
    uptime: process.uptime(),
    lastPing: lastPing
  });
});

// Get own URL helper
function getOwnUrl() {
  const renderServiceName = process.env.RENDER_SERVICE_NAME || 'discord-execution-bot';
  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
  
  if (renderExternalUrl) {
    return renderExternalUrl;
  } else if (process.env.RENDER) {
    return `https://${renderServiceName}.onrender.com`;
  } else {
    return `http://localhost:${PORT}`;
  }
}

// Self-ping function
async function pingSelf() {
  const url = getOwnUrl();
  
  while (isRunning) {
    try {
      const response = await axios.get(`${url}/ping`, { timeout: 10000 });
      const now = new Date().toLocaleTimeString();
      
      if (response.status === 200) {
        console.log(`💓 [${now}] Self-ping successful - Status: ${response.status}`);
      } else {
        console.warn(`⚠️  [${now}] Self-ping failed - Status: ${response.status}`);
      }
    } catch (error) {
      const now = new Date().toLocaleTimeString();
      console.error(`❌ [${now}] Self-ping error:`, error.message);
    }
    
    // Wait 5 minutes (300000ms) before next ping
    await new Promise(resolve => setTimeout(resolve, 300000));
  }
}

// Start the keep-alive system
function startKeepAlive() {
  // Start Express server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Flask server started on port ${PORT}`);
    console.log(`📡 Server URL: ${getOwnUrl()}`);
    console.log('✅ Keep-alive system fully active');
    console.log('⏰ Will auto-ping every 5 minutes');
  });
  
  // Start self-pinger after a short delay
  setTimeout(() => {
    pingSelf();
    console.log('✅ Self-pinger started (pinging every 5 minutes)');
  }, 5000);
}

module.exports = { startKeepAlive };
