import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends Document {
  @Prop({ required: true, index: true }) action: string;
  @Prop({ required: true, index: true }) entityName: string;
  @Prop({ required: true }) entityId: string;
  @Prop({ required: true }) performedById: string;
  @Prop({ type: Object }) payload?: Record<string, any>;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);