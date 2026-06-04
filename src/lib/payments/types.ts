export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string;
}

export interface PaymentResponse {
  ref: string;
  bank: BankDetails;
  amount: number;
  currency: string;
}
