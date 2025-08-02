import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeepResearchDegen } from './src/services/DeepResearchDegen.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Research API endpoint
app.post('/api/research', async (req, res) => {
  try {
    const { projectName, website, twitter, contractAddress } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!openaiKey || !tavilyKey) {
      return res.status(500).json({ 
        error: 'API keys not configured on server' 
      });
    }

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

// Catch all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});