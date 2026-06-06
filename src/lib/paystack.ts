/**
 * Paystack API wrapper
 * Direct REST API calls — no third-party SDK needed.
 * All amounts are in kobo (₦1 = 100 kobo).
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

interface PaystackResponse<T = Record<string, unknown>> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T = Record<string, unknown>>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): Promise<PaystackResponse<T>> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Paystack API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

// ─── Subaccounts (Creator Registration) ───────────────────────────

interface CreateSubaccountData {
  business_name: string;
  settlement_bank: string; // Bank code
  account_number: string;
  percentage_charge: number; // Platform fee percentage (e.g. 10)
  primary_contact_email?: string;
}

export async function createSubaccount(data: CreateSubaccountData) {
  return paystackRequest('/subaccount', 'POST', data);
}

// ─── Plans (Tier Creation) ────────────────────────────────────────

interface CreatePlanData {
  name: string;
  amount: number; // Amount in kobo
  interval: 'monthly';
  description?: string;
}

export async function createPlan(data: CreatePlanData) {
  return paystackRequest('/plan', 'POST', {
    ...data,
    interval: 'monthly',
  });
}

// ─── Transactions (Subscription Checkout) ─────────────────────────

interface InitializeTransactionData {
  email: string;
  amount: number; // Amount in kobo
  plan?: string; // Plan code for subscriptions
  subaccount?: string; // Subaccount code for splits
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

interface InitializeTransactionResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(data: InitializeTransactionData) {
  return paystackRequest<InitializeTransactionResponse>(
    '/transaction/initialize',
    'POST',
    data
  );
}

export async function verifyTransaction(reference: string) {
  return paystackRequest(`/transaction/verify/${reference}`);
}

// ─── Subscriptions ────────────────────────────────────────────────

export async function cancelSubscription(code: string, emailToken: string) {
  return paystackRequest('/subscription/disable', 'POST', {
    code,
    token: emailToken,
  });
}

// ─── Bank Utilities ───────────────────────────────────────────────

interface Bank {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
  country: string;
}

export async function listBanks() {
  return paystackRequest<Bank[]>('/bank?country=nigeria');
}

interface ResolveAccountResponse {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string
) {
  return paystackRequest<ResolveAccountResponse>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
}

// ─── Webhook Verification ─────────────────────────────────────────

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');
  return hash === signature;
}
