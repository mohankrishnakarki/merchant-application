export interface IAuditLog {
  action: string;
  entityName: string;
  entityId: string;
  performedById: string;
  payload?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}