import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { UserBulkCreateResultDTO, UserTypeEmail } from '@domains';

type ExcelRow = Record<string, unknown>;

@Injectable()
export class ExcelUserImportService {
  constructor(private readonly config: ConfigService) {}

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getStringValue(row: ExcelRow, keys: string[]): string {
    for (const key of keys) {
      const value = row[key];

      if (value !== undefined && value !== null) {
        return String(value).trim();
      }
    }

    return '';
  }

  async importUserFromExcel(buffer: Buffer, typeEmail: UserTypeEmail) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException('Excel file does not contain sheets');
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
      defval: '',
    });

    const users = rows
      .map((row) => {
        const name = this.getStringValue(row, [
          'name',
          'Name',
          'NAME',
          'Имя',
          'ФИО',
          'Фио',
          'фио',
        ]);

        const email = this.getStringValue(row, [
          'email',
          'Email',
          'EMAIL',
          'mail',
          'Mail',
          'Почта',
          'почта',
          'E-mail',
          'e-mail',
        ]);

        return {
          name,
          email,
          typeEmail,
          role: 'client',
        };
      })
      .filter((user) => user.name && user.email && this.isValidEmail(user.email));

    if (!users.length) {
      throw new BadRequestException(
        'No valid users found. Excel columns should contain name/email or Имя/Почта',
      );
    }

    const gateUrl = this.config.get<string>('GATE_URL') || 'http://localhost:3000';

    const response = await axios.post<UserBulkCreateResultDTO>(`${gateUrl}/users/bulk`, users);

    return {
      count: response.data.importedCount,
      ...response.data,
    };
  }
}
