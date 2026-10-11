import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from .env
config(); 

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Tell the CLI where to find your entities and migrations
  entities: ['src/modules/**/entities/*.entity.ts'],
  migrations: ['src/infrastructure/database/postgres/migrations/*.ts'],
  synchronize: false,
});