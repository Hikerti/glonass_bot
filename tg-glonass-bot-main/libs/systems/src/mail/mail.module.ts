import {Global, Module} from "@nestjs/common";
import {ConfigModule} from "@nestjs/config";
import {MailService} from "./mail.service";
import {BullModule} from "@nestjs/bull";
import {MailScheduler} from "./mail.scheduler";
import {MailProcessor} from "./mail.processor";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ["envs/local/gate/app.env", "envs/local/gate/mail.env"], isGlobal: true,
        }),
        BullModule.registerQueue({
            name: 'mail',
        }),
    ],
    providers: [
        MailService, MailScheduler, MailProcessor
    ],
    exports: [
        MailService, MailScheduler, MailProcessor
    ]
})

export class EmailModule {}
