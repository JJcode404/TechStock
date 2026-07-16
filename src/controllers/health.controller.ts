import type { Request, Response } from 'express';
import { HealthService, healthService } from '../services/health.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class HealthController {
  constructor(private readonly service: HealthService = healthService) {}

  live = (_req: Request, res: Response): void => {
    sendSuccess(res, { status: 'ok' }, 'Service is alive');
  };

  ready = async (_req: Request, res: Response): Promise<void> => {
    const report = await this.service.check();
    const status = report.status === 'ok' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    sendSuccess(res, report, 'Health check', status);
  };

  metrics = async (_req: Request, res: Response): Promise<void> => {
    const metrics = await this.service.metrics();
    sendSuccess(res, metrics, 'Metrics');
  };
}

export const healthController = new HealthController();
