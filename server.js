import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import DeepResearchDegen directly
import { DeepResearchDegen } from './src/services/DeepResearchDegen.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
console.log('Starting server...');
console.log('Environment variables check:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
console.log('- TAVILY_API_KEY:', process.env.TAVILY_API_KEY ? 'Set' : 'Missing');
console.log('- PORT:', PORT);
console.log('- __dirname:', __dirname);

// Verify dist directory exists
import fs from 'fs';
const distPath = path.join(__dirname, 'dist');
console.log('- dist directory exists:', fs.existsSync(distPath));
if (fs.existsSync(distPath)) {
  console.log('- dist contents:', fs.readdirSync(distPath));
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    deepResearchLoaded: !!DeepResearchDegen,
    apiKeys: {
      openai: !!process.env.OPENAI_API_KEY,
      tavily: !!process.env.TAVILY_API_KEY
    }
  });
});

// Research API endpoint
app.post('/api/research', async (req, res) => {
  console.log('📡 Research API called');
  
  try {
    const { projectName, website, twitter, contractAddress } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!openaiKey || !tavilyKey) {
      console.error('Missing API keys:', { openai: !!openaiKey, tavily: !!tavilyKey });
      return res.status(500).json({ 
        error: 'API keys not configured on server',
        details: 'Both OpenAI and Tavily API keys are required' 
      });
    }

    console.log('Starting research for:', projectName);

    const researcher = new DeepResearchDegen(openaiKey, tavilyKey);
    
    const report = await researcher.generateReport({
      projectName,
      website: website || '',
      twitter: twitter || '',
      contractAddress: contractAddress || ''
    });

    res.json(report);
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ 
      error: 'Failed to generate research report',
      details: error.message 
    });
  }
});

// Serve static files from the dist directory (after API routes)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  try {
    console.log('Serving SPA for route:', req.path);
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('index.html not found at:', indexPath);
      res.status(404).send('Application not built properly - index.html missing');
    }
  } catch (error) {
    console.error('Error serving SPA:', error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});