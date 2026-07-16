import type { Request, Response } from 'express';
import { PurchaseService, purchaseService } from '../services/purchase.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { UnauthorizedError } from '../errors/index.js';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrderQuery,
  ReceivePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from '../validators/purchase.validator.js';

export class PurchaseController {
  constructor(private readonly service: PurchaseService = purchaseService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const po = await this.service.create(req.body as CreatePurchaseOrderInput, req.user.id, req.context);
    sendCreated(res, po, 'Purchase order created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListPurchaseOrderQuery);
    sendSuccess(res, data, 'Purchase orders retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const po = await this.service.getById(req.params.id as string);
    sendSuccess(res, po, 'Purchase order retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const po = await this.service.update(
      req.params.id as string,
      req.body as UpdatePurchaseOrderInput,
      req.user.id,
      req.context,
    );
    sendSuccess(res, po, 'Purchase order updated');
  };

  receive = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const po = await this.service.receive(
      req.params.id as string,
      req.body as ReceivePurchaseOrderInput,
      req.user.id,
      req.context,
    );
    sendSuccess(res, po, 'Purchase order received');
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const po = await this.service.cancel(req.params.id as string, req.user.id, req.context);
    sendSuccess(res, po, 'Purchase order cancelled');
  };
}

export const purchaseController = new PurchaseController();
