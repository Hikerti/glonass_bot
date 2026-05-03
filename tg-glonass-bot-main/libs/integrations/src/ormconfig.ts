import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import {Post, User} from "@domains";

dotenv.config({ path: 'envs/local/database/postgres.env' });

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "database",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB,
    entities: [User, Post],
    migrations: ["src/migrations/*.ts"],
    synchronize: false,
    logging: true,
});