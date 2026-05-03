import { Module } from "@nestjs/common";
import { ClientService } from "./client.service";
import {ClientAddEmailWizardService} from "./add-email";

@Module({
    imports: [],

    providers: [ClientService, ClientAddEmailWizardService],
    exports: [ClientService, ClientAddEmailWizardService],
})
export class ClientBotModule {}