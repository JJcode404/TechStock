export type { AuthenticatedUser, RequestContext } from './express.js';

/** Sync envelope fields shared by offline-capable models. */
export interface SyncFields {
  syncVersion: number;
  deviceId: string | null;
  isDeleted: boolean;
  updatedAt: Date;
}

/** Standard list query shape shared across list endpoints. */
export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
