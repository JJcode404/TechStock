import type { Request, Response } from 'express';
import { CategoryService, categoryService } from '../services/category.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import type {
  CreateCategoryInput,
  ListCategoryQuery,
  UpdateCategoryInput,
} from '../validators/category.validator.js';

export class CategoryController {
  constructor(private readonly service: CategoryService = categoryService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.create(req.body as CreateCategoryInput, req.context);
    sendCreated(res, category, 'Category created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListCategoryQuery);
    sendSuccess(res, data, 'Categories retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.getById(req.params.id as string);
    sendSuccess(res, category, 'Category retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const category = await this.service.update(
      req.params.id as string,
      req.body as UpdateCategoryInput,
      req.context,
    );
    sendSuccess(res, category, 'Category updated');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(req.params.id as string, req.context);
    sendSuccess(res, null, 'Category deleted');
  };
}

export const categoryController = new CategoryController();
