import type { Request, Response } from 'express';
import { ReportService, reportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import type {
  DateRangeQuery,
  SalesSummaryQuery,
  TopProductsQuery,
} from '../validators/report.validator.js';

export class ReportController {
  constructor(private readonly service: ReportService = reportService) {}

  dashboard = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.dashboard(), 'Dashboard summary');
  };

  todaySales = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.todaySales(), "Today's sales");
  };

  monthlySales = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.monthlySales(), 'Monthly sales');
  };

  salesSummary = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.salesSummary(req.query as unknown as SalesSummaryQuery);
    sendSuccess(res, data, 'Sales summary');
  };

  topProducts = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.topProducts(req.query as unknown as TopProductsQuery);
    sendSuccess(res, data, 'Top selling products');
  };

  mostProfitable = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.mostProfitableProducts(req.query as unknown as TopProductsQuery);
    sendSuccess(res, data, 'Most profitable products');
  };

  recentSales = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    sendSuccess(res, await this.service.recentSales(limit), 'Recent sales');
  };

  profitReport = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.profitReport(req.query as unknown as DateRangeQuery);
    sendSuccess(res, data, 'Profit report');
  };
}

export const reportController = new ReportController();
