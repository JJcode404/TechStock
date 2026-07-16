/**
 * Auth controller. Thin HTTP adapter: reads validated input, delegates to the
 * service, shapes the response. No business logic here.
 */
import type { Request, Response } from 'express';
import { AuthService, authService } from '../services/auth.service.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { UnauthorizedError } from '../errors/index.js';
import type {
  ChangePasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
} from '../validators/auth.validator.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body as RegisterInput, req.context);
    sendCreated(res, result, 'Account created successfully');
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginInput, req.context);
    sendSuccess(res, result, 'Logged in successfully');
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as RefreshInput;
    const tokens = await this.service.refresh(refreshToken, req.context);
    sendSuccess(res, { tokens }, 'Token refreshed');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const { refreshToken, allDevices } = req.body as LogoutInput;
    await this.service.logout(req.user.id, refreshToken, allDevices, req.context);
    sendSuccess(res, null, 'Logged out successfully');
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const profile = await this.service.getProfile(req.user.id);
    sendSuccess(res, profile, 'Profile retrieved');
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    await this.service.changePassword(req.user.id, req.body as ChangePasswordInput, req.context);
    sendSuccess(res, null, 'Password changed. Please log in again.');
  };
}

export const authController = new AuthController();
