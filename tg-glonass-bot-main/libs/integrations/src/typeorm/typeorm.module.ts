import {Global, Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {User, Post} from "@domains";
import {ConfigModule, ConfigService} from "@nestjs/config";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: 'envs/local/database/postgres.env',
        }),

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isDocker = configService.get<string>('RUNNING_IN_DOCKER') === 'true';
                const runMigrations = configService.get<string>('RUN_MIGRATIONS') === 'true';
                const configuredHost = configService.get<string>('DATABASE_HOST_LOCAL') || configService.get<string>('DATABASE_HOST');
                const host = isDocker ? configService.get<string>('DATABASE_HOST') : (configuredHost === 'database' ? 'localhost' : configuredHost);

                return {
                    type: 'postgres',
                    host,
                    port: configService.get<number>('DATABASE_PORT'),
                    username: configService.get<string>('DATABASE_USER'),
                    password: configService.get<string>('DATABASE_PASSWORD'),
                    database: configService.get<string>('DATABASE_DB'),
                    migrations: runMigrations ? [isDocker ? "dist/src/migrations/*.js" : "src/migrations/*.ts"] : [],
                    migrationsRun: runMigrations,
                    entities: [User, Post],
                    synchronize: true,
                    logging: true,
                };
            },
            inject: [ConfigService],
        }),
    ]
})

export class TypeormModule {}
