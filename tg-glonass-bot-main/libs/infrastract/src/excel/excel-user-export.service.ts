import {Injectable} from "@nestjs/common";
import axios from "axios";
import {ConfigService} from "@nestjs/config";
import {UserDTO} from "@domains";
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelUserExportService {
    constructor(private readonly config: ConfigService) {
    }
    async exportUserFromExcel() {
        try {
            const gateUrl = this.config.get<string>("GATE_URL");
            const response = await axios.get(`${gateUrl}/users`, {
                params: {
                    page: 1,
                    limit: 9999,
                    role: 'client'
                }
            });
            const users: UserDTO[] = response.data.items;

            if (!users.length) return null;

            const worksheet = XLSX.utils.json_to_sheet(users, { header: ["name", "email"] });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

            return XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });
        } catch (e) {
            console.error(e);
        }
    }
}