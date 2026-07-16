import type { Request, Response } from 'express';
import { SaleService, saleService } from '../services/sale.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { UnauthorizedError } from '../errors/index.js';
import type {
  CancelSaleInput,
  CreateSaleInput,
  ListSaleQuery,
  ReturnSaleInput,
} from '../validators/sale.validator.js';

export class SaleController {
  constructor(private readonly service: SaleService = saleService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const sale = await this.service.create(req.body as CreateSaleInput, req.user.id, req.context);
    sendCreated(res, sale, 'Sale completed');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListSaleQuery);
    sendSuccess(res, data, 'Sales history retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const sale = await this.service.getById(req.params.id as string);
    sendSuccess(res, sale, 'Sale retrieved');
  };

  getReceipt = async (req: Request, res: Response): Promise<void> => {
    const receipt = await this.service.getReceipt(req.params.id as string);
    sendSuccess(res, receipt, 'Receipt retrieved');
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const sale = await this.service.cancel(
      req.params.id as string,
      req.body as CancelSaleInput,
      req.user.id,
      req.context,
    );
    sendSuccess(res, sale, 'Sale cancelled');
  };

  return = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const sale = await this.service.return(
      req.params.id as string,
      req.body as ReturnSaleInput,
      req.user.id,
      req.context,
    );
    sendSuccess(res, sale, 'Return processed');
  };
}

export const saleController = new SaleController();
