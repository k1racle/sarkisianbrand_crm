import { BadRequestException } from '@nestjs/common';

// Check digits: https://developers.tochka.com/docs/cyclops/validation
export function validBusinessInn(value: string): boolean {
  if (!/^(?:\d{10}|\d{12})$/.test(value) || value.startsWith('00')) return false;
  const digits = Array.from(value, Number);
  const checksum = (weights: number[]) => weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10;
  return value.length === 10 ? checksum([2,4,10,3,5,9,4,6,8]) === digits[9]
    : checksum([7,2,4,10,3,5,9,4,6,8]) === digits[10] && checksum([3,7,2,4,10,3,5,9,4,6,8]) === digits[11];
}
export function businessCompanyDetails(dto: { companyName: string; inn?: string; kpp?: string; legalAddress?: string }) {
  const companyName = dto.companyName.trim(), inn = dto.inn?.trim() || undefined, kpp = dto.kpp?.trim() || undefined, legalAddress = dto.legalAddress?.trim() || undefined;
  if (companyName.length < 2) throw new BadRequestException('Укажите название салона или компании');
  if (inn && !validBusinessInn(inn)) throw new BadRequestException('Проверьте ИНН: нужно 10 или 12 цифр с корректным контрольным числом');
  if (kpp && (!/^\d{9}$/.test(kpp) || kpp.startsWith('00') || !inn || inn.length !== 10)) throw new BadRequestException('КПП состоит из 9 цифр и указывается вместе с 10-значным ИНН организации');
  return { companyName, inn, kpp, legalAddress };
}
