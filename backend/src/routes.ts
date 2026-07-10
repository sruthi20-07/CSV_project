import { Router } from 'express';
import { healthCheck } from './controllers/health.controller';
import { uploadCSV } from './controllers/upload.controller';
import { processCSV } from './controllers/process.controller';
import { upload } from './middleware/upload.middleware';

const router = Router();

// Health Check
router.get('/health', healthCheck);

// File Upload (limit to 1 file in request parameter 'file')
router.post('/upload', upload.single('file'), uploadCSV);

// Process CSV mappings, validations, duplicate detection and data cleanings
router.post('/process', processCSV);

export default router;
