import type { Request, Response } from 'express';
import { CustomerService, customerService } from '../services/customer.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import type {
  AdjustLoyaltyInput,
  CreateCustomerInput,
  ListCustomerQuery,
  UpdateCustomerInput,
} from '../validators/customer.validator.js';

export class CustomerController {
  constructor(private readonly service: CustomerService = customerService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const customer = await this.service.create(req.body as CreateCustomerInput, req.context);
    sendCreated(res, customer, 'Customer created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListCustomerQuery);
    sendSuccess(res, data, 'Customers retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const customer = await this.service.getById(req.params.id as string);
    sendSuccess(res, customer, 'Customer retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const customer = await this.service.update(
      req.params.id as string,
      req.body as UpdateCustomerInput,
      req.context,
    );
    sendSuccess(res, customer, 'Customer updated');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(req.params.id as string, req.context);
    sendSuccess(res, null, 'Customer deleted');
  };

  purchaseHistory = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.purchaseHistory(req.params.id as string, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    sendSuccess(res, data, 'Customer purchase history', undefined, meta);
  };

  outstandingBalance = async (req: Request, res: Response): Promise<void> => {
    const balance = await this.service.getOutstandingBalance(req.params.id as string);
    sendSuccess(res, balance, 'Customer outstanding balance');
  };

  adjustLoyalty = async (req: Request, res: Response): Promise<void> => {
    const customer = await this.service.adjustLoyalty(
      req.params.id as string,
      req.body as AdjustLoyaltyInput,
      req.context,
    );
    sendSuccess(res, customer, 'Loyalty points adjusted');
  };
}

export const customerController = new CustomerController();
