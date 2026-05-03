import { Module } from "@nestjs/common";
import { AdminGeneralUpdateService } from "./updates";
import { AdminPostsService, AdminPostsWizardService, AdminPostsWizardUpdateService } from "./posts";
import { AdminUserService, AdminUsersWizardService } from "./users";
import { AdminExcelService, ImportUsersWizard } from "./excel";
import {ExcelModule, S3Module} from "@infrastract";
import { AiModule } from "@integrations";
import {BroadcastModule, EmailModule, VkModule} from "@systems";
import { ScheduleModule } from '@nestjs/schedule'; 

@Module({
    imports: [S3Module, ExcelModule, AiModule, BroadcastModule, EmailModule, VkModule, ScheduleModule.forRoot()],

    providers: [
        AdminPostsWizardUpdateService,
        ImportUsersWizard,
        AdminGeneralUpdateService,
        AdminPostsWizardService,
        AdminUsersWizardService,
        AdminPostsService,
        AdminUserService,
        AdminExcelService,
    ],
    exports: [
        AdminPostsWizardUpdateService,
        ImportUsersWizard,
        AdminGeneralUpdateService,
        AdminPostsWizardService,
        AdminUsersWizardService,
        AdminPostsService,
        AdminUserService,
        AdminExcelService,
    ]
})
export class AdminBotModule {}