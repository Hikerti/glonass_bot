import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import * as XLSX from 'xlsx';
import axios from "axios";
import { UserTypeEmail } from "@domains";

export interface ExcelUserFromImport  {
    name: string,
    email: string
}

@Injectable()
export class ExcelUserImportService {
    constructor(private readonly config: ConfigService) {}

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async importUserFromExcel(buffer: Buffer, typeEmail: UserTypeEmail) {
        try {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: ExcelUserFromImport[] = XLSX.utils.sheet_to_json(sheet);

            const validUsers = rows
                .filter(u => u.name?.trim() && u.email?.trim() && this.isValidEmail(u.email))
                .map(u => ({
                    ...u,
                    typeEmail,
                    role: 'client'
                }));

            const gateUrl = this.config.get<string>('GATE_URL');
            await axios.post(`${gateUrl}/users/bulk`, validUsers);
            
            return { count: validUsers.length };
        } catch (e) {
            console.error('Excel Import Error:', e);
            return null;
        }
    }
}