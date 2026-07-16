import type { Request, Response } from 'express';
import { ExpenseService, expenseService } from '../services/expense.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { UnauthorizedError } from '../errors/index.js';
import type {
  CreateExpenseInput,
  ListExpenseQuery,
  UpdateExpenseInput,
} from '../validators/expense.validator.js';

export class ExpenseController {
  constructor(private readonly service: ExpenseService = expenseService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const expense = await this.service.create(req.body as CreateExpenseInput, req.user.id, req.context);
    sendCreated(res, expense, 'Expense recorded');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListExpenseQuery);
    sendSuccess(res, data, 'Expenses retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getById(req.params.id as string), 'Expense retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const expense = await this.service.update(
      req.params.id as string,
      req.body as UpdateExpenseInput,
      req.context,
    );
    sendSuccess(res, expense, 'Expense updated');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(req.params.id as string, req.context);
    sendSuccess(res, null, 'Expense deleted');
  };
}

export const expenseController = new ExpenseController();
