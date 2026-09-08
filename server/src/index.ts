import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { logger } from './utils/logger';
import healthRoutes from './routes/healthRoutes';
import voiceRoutes from './routes/voiceRoutes';
import ttsRoutes from './routes/ttsRoutes';
import audioRoutes from './routes/audioRoutes';
import { ProjectService } from './services/projectService';

const app = express();

// Storage Initialization
ProjectService.initStorage();

// Periodic temporary storage cleanup (every 6 hours)
setInterval(() => {
  ProjectService.cleanupOldFiles(24).catch((err) => logger.error('Cleanup error:', err));
}, 6 * 60 * 60 * 1000);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Backend Rate Limiting (100 requests per minute per IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests to VoiceForge backend. Please slow down.' }
});

app.use('/api', apiLimiter);

// Mount API Routes
app.use('/api', healthRoutes);
app.use('/api', voiceRoutes);
app.use('/api', ttsRoutes);
app.use('/api', audioRoutes);

// Static frontend serving (for production or unified single-port hosting)
const clientDistPath = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../../client/dist')
].find((p) => fs.existsSync(p));

if (clientDistPath) {
  logger.info(`Serving static client assets from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Fallback Route if client dist is not built
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found on VoiceForge Studio API' });
  });
}

// Start Express Server
const PORT = config.port;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`=======================================================`);
    logger.info(` VoiceForge Studio Server running on port ${PORT} (0.0.0.0)`);
    logger.info(` Environment: ${config.nodeEnv}`);
    logger.info(` Fish Audio API Key configured: ${Boolean(config.fishApiKey && config.fishApiKey !== 'YOUR_FISH_AUDIO_API_KEY_HERE')}`);
    logger.info(`=======================================================`);
  });
}

export default app;
