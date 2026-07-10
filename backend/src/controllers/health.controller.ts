import { Request, Response } from 'express';

export const healthCheck = (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GrowEasy CRM AI CSV Importer API',
  });
};
