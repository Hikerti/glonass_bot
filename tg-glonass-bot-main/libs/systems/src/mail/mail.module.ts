import {Global, Module} from "@nestjs/common";
import {ConfigModule} from "@nestjs/config";
import {MailService} from "./mail.service";
import {BullModule} from "@nestjs/bull";
import {MailScheduler} from "./mail.scheduler";
import {MailProcessor, TargetedMailProcessor} from "./mail.processor";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ["envs/local/gate/app.env", "envs/local/gate/mail.env"], isGlobal: true,
        }),
        BullModule.registerQueue({
            name: 'mail',
        }),
        BullModule.registerQueue({
            name: 'mail-targeted',
        }),
    ],
    providers: [
        MailService, MailScheduler, MailProcessor, TargetedMailProcessor
    ],
    exports: [
        MailService, MailScheduler, MailProcessor, TargetedMailProcessor
    ]
})

export class EmailModule {}
