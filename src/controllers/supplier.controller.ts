import type { Request, Response } from 'express';
import { SupplierService, supplierService } from '../services/supplier.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import type {
  CreateSupplierInput,
  ListSupplierQuery,
  UpdateSupplierInput,
} from '../validators/supplier.validator.js';

export class SupplierController {
  constructor(private readonly service: SupplierService = supplierService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const supplier = await this.service.create(req.body as CreateSupplierInput, req.context);
    sendCreated(res, supplier, 'Supplier created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListSupplierQuery);
    sendSuccess(res, data, 'Suppliers retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const supplier = await this.service.getById(req.params.id as string);
    sendSuccess(res, supplier, 'Supplier retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const supplier = await this.service.update(
      req.params.id as string,
      req.body as UpdateSupplierInput,
      req.context,
    );
    sendSuccess(res, supplier, 'Supplier updated');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(req.params.id as string, req.context);
    sendSuccess(res, null, 'Supplier deleted');
  };

  purchaseHistory = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.purchaseHistory(req.params.id as string, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    sendSuccess(res, data, 'Supplier purchase history', undefined, meta);
  };

  outstandingBalance = async (req: Request, res: Response): Promise<void> => {
    const balance = await this.service.getOutstandingBalance(req.params.id as string);
    sendSuccess(res, balance, 'Supplier outstanding balance');
  };
}

export const supplierController = new SupplierController();
