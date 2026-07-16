import type { Request, Response } from 'express';
import { SyncService, syncService } from '../services/sync.service.js';
import { BackupService, backupService } from '../services/backup.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import type { PullQuery, PushBody } from '../validators/sync.validator.js';

export class SyncController {
  constructor(
    private readonly sync: SyncService = syncService,
    private readonly backup: BackupService = backupService,
  ) {}

  pull = async (req: Request, res: Response): Promise<void> => {
    const data = await this.sync.pull(req.query as unknown as PullQuery);
    sendSuccess(res, data, 'Pull complete');
  };

  push = async (req: Request, res: Response): Promise<void> => {
    const result = await this.sync.push(req.body as PushBody);
    sendSuccess(res, result, 'Push processed');
  };

  createBackup = async (_req: Request, res: Response): Promise<void> => {
    const meta = await this.backup.create();
    sendCreated(res, meta, 'Backup created');
  };

  listBackups = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.backup.list(), 'Backups listed');
  };
}

export const syncController = new SyncController();
