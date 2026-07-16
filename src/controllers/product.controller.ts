import type { Request, Response } from 'express';
import { ProductService, productService } from '../services/product.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { BadRequestError } from '../errors/index.js';
import type {
  AddImageInput,
  CreateProductInput,
  ListProductQuery,
  UpdateProductInput,
} from '../validators/product.validator.js';

export class ProductController {
  constructor(private readonly service: ProductService = productService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const product = await this.service.create(req.body as CreateProductInput, req.context);
    sendCreated(res, product, 'Product created');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { data, meta } = await this.service.list(req.query as unknown as ListProductQuery);
    sendSuccess(res, data, 'Products retrieved', undefined, meta);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const product = await this.service.getById(req.params.id as string);
    sendSuccess(res, product, 'Product retrieved');
  };

  getByBarcode = async (req: Request, res: Response): Promise<void> => {
    const product = await this.service.getByBarcode(req.params.barcode as string);
    sendSuccess(res, product, 'Product retrieved');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const product = await this.service.update(
      req.params.id as string,
      req.body as UpdateProductInput,
      req.context,
    );
    sendSuccess(res, product, 'Product updated');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(req.params.id as string, req.context);
    sendSuccess(res, null, 'Product deleted');
  };

  uploadImage = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new BadRequestError('An image file is required (field: "image")');
    const image = await this.service.addImage(
      req.params.id as string,
      req.file,
      req.body as AddImageInput,
      req.context,
    );
    sendCreated(res, image, 'Image uploaded');
  };

  removeImage = async (req: Request, res: Response): Promise<void> => {
    await this.service.removeImage(req.params.id as string, req.params.imageId as string);
    sendSuccess(res, null, 'Image removed');
  };

  lowStock = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const products = await this.service.lowStock(limit);
    sendSuccess(res, products, 'Low stock products');
  };

  outOfStock = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const products = await this.service.outOfStock(limit);
    sendSuccess(res, products, 'Out of stock products');
  };
}

export const productController = new ProductController();
