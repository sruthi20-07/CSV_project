import { Request, Response } from 'express';
import fs from 'fs';
import { parseCSVHeadersAndSample } from '../utils/csv';
import { GeminiService } from '../services/gemini.service';

export const uploadCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const apiKeyHeader = req.headers['x-gemini-key'] as string;

    console.log(`[Stateless Upload] Processing file: ${fileName} (${fileSize} bytes)`);

    // Parse CSV headers and samples (first 5 rows)
    let headers: string[] = [];
    let samples: any[] = [];
    try {
      const parsed = await parseCSVHeadersAndSample(filePath, 5);
      headers = parsed.headers;
      samples = parsed.samples;
    } catch (parseErr: any) {
      console.error(`[Upload Error] Parse CSV failed: ${parseErr.message}`);
      res.status(400).json({ error: `Failed to parse CSV file: ${parseErr.message}` });
      return;
    } finally {
      // Clean up the temporary file immediately after parsing headers/samples
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] Uploaded temp file deleted: ${filePath}`);
        }
      } catch (cleanupErr) {
        console.error('[Cleanup Error] Failed to delete temp file:', cleanupErr);
      }
    }

    // Call Gemini to get suggested header mappings
    let geminiMappings: any[] = [];
    let geminiError: string | null = null;

    try {
      const key = apiKeyHeader || process.env.GEMINI_API_KEY;
      if (key) {
        geminiMappings = await GeminiService.suggestHeaderMapping(headers, samples, key);
      } else {
        geminiError = 'Google Gemini API Key is missing. Manual mapping override is required.';
      }
    } catch (geminiErr: any) {
      console.error('[Gemini Mapping Suggestion failed]:', geminiErr);
      geminiError = geminiErr.message || 'Gemini mapping failed';
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    console.log(`[Upload] Generated Job ID: ${jobId}`);

    res.json({
      success: true,
      jobId,
      fileName,
      fileSize,
      headers,
      sampleRows: samples,
      suggestedMappings: geminiMappings,
      geminiError,
    });
  } catch (error: any) {
    console.error('[Upload CSV Controller Error]:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
