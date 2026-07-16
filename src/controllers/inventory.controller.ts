import type { Request, Response } from 'express';
import { InventoryService, inventoryService } from '../services/inventory.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { UnauthorizedError } from '../errors/index.js';
import type {
  CreateAdjustmentInput,
  ListAdjustmentQuery,
  ListMovementQuery,
} from '../validators/inventory.validator.js';

export class InventoryController {
  constructor(private readonly service: InventoryService = inventoryService) {}

  createAdjustment = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const adjustment = await this.service.createAdjustment(
      req.body as CreateAdjustmentInput,
      req.user.id,
      req.context,
    );
    sendCreated(res, adjustment, 'Inventory adjusted');
  };

  listMovements = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.listMovements(req.query as unknown as ListMovementQuery);
    sendSuccess(res, data, 'Stock movements retrieved', undefined, meta);
  };

  listAdjustments = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.listAdjustments(
      req.query as unknown as ListAdjustmentQuery,
    );
    sendSuccess(res, data, 'Adjustments retrieved', undefined, meta);
  };

  stockValue = async (_req: Request, res: Response): Promise<void> => {
    const value = await this.service.getStockValue();
    sendSuccess(res, value, 'Stock valuation');
  };
}

export const inventoryController = new InventoryController();
