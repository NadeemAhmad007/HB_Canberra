import type { BankDetails } from "./types";

const DEFAULTS: BankDetails = {
  bankName: "State Bank of India",
  accountName: "Houseboat Canberra",
  accountNumber: "12345678901",
  ifsc: "SBIN0001234",
  upiId: "houseboatcanberra@sbi",
};

export function getBankDetails(settings: Record<string, string>): BankDetails {
  return {
    bankName: settings.bank_name || DEFAULTS.bankName,
    accountName: settings.bank_account_name || DEFAULTS.accountName,
    accountNumber: settings.bank_account_number || DEFAULTS.accountNumber,
    ifsc: settings.bank_ifsc || DEFAULTS.ifsc,
    upiId: settings.bank_upi_id || DEFAULTS.upiId,
  };
}

export function formatBankDetails(bank: BankDetails): string {
  return [
    `Bank: ${bank.bankName}`,
    `Account Name: ${bank.accountName}`,
    `Account No: ${bank.accountNumber}`,
    `IFSC: ${bank.ifsc}`,
    bank.upiId ? `UPI: ${bank.upiId}` : "",
  ].filter(Boolean).join("\n");
}
