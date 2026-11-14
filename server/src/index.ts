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
import openSourceTtsRoutes from './routes/openSourceTtsRoutes';
import audioRoutes from './routes/audioRoutes';
import asrRoutes from './routes/asrRoutes';
import captionRoutes from './routes/captionRoutes';
import translationRoutes from './routes/translationRoutes';
import videoEditorRoutes from './routes/videoEditorRoutes';
import { ProjectService } from './services/projectService';
import { VoiceTranslationStorageService } from './services/voiceTranslationStorageService';
import { VideoEditorService } from './services/videoEditorService';

const app = express();

// Enable trust proxy for reverse proxies (Render, Heroku, Cloudflare, Docker)
app.set('trust proxy', 1);

// Storage Initialization
ProjectService.initStorage();
VoiceTranslationStorageService.initStorage();
VideoEditorService.initStorage();

// Periodic temporary storage cleanup (every 6 hours)
setInterval(() => {
  ProjectService.cleanupOldFiles(24).catch((err) => logger.error('Cleanup error:', err));
}, 6 * 60 * 60 * 1000).unref();

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
  message: { error: 'Too many requests to VoiceForge backend. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

app.use('/api', apiLimiter);

// Mount API Routes
app.use('/api', healthRoutes);
app.use('/api', voiceRoutes);
app.use('/api', ttsRoutes);
app.use('/api/open-source-tts', openSourceTtsRoutes);
app.use('/api', audioRoutes);
app.use('/api', asrRoutes);
app.use('/api/captions', captionRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/editor', videoEditorRoutes);

// Always return JSON 404 for unmatched /api/* routes (never Express HTML <!DOCTYPE html>)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}. If you recently updated the code, restart the backend server.`
  });
});

// Static frontend serving (for production or unified single-port hosting)
const clientDistPath = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../../client/dist')
].find((p) => fs.existsSync(p));

if (clientDistPath) {
  logger.info(`Serving static client assets from: ${clientDistPath}`);
  app.use(express.static(clientDistPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Fallback Route if client dist is not built
  app.use((_req, res) => {
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
