import type {
  BuildTxResponse,
  SubmitTxDto,
  SubmitTxResponse,
  RegisterWalletDto,
  CreateSubDto,
  ReorderSubsDto,
  SpendableView,
  WalletBalanceView,
  Sub,
} from '@yield2pay/shared';

import { ApiError } from './apiError';
import { buildErrorDetails } from './errorDetails';
import { publishErrorNotification } from './errorNotifications';

// Reexportado porque as telas e lib/errors.ts sempre importaram ApiError daqui.
export { ApiError };

type GetToken = () => Promise<string | null>;

interface ApiMethods {
  registerWallet(body: RegisterWalletDto): Promise<void>;
  buildDeposit(amount: string): Promise<BuildTxResponse>;
  submitDeposit(body: SubmitTxDto): Promise<SubmitTxResponse>;
  buildWithdraw(amount: string): Promise<BuildTxResponse>;
  submitWithdraw(body: SubmitTxDto): Promise<SubmitTxResponse>;
  getDashboard(): Promise<SpendableView>;
  getWalletBalance(): Promise<WalletBalanceView>;
  listSubs(): Promise<Sub[]>;
  createSub(body: CreateSubDto): Promise<Sub>;
  reorderSubs(body: ReorderSubsDto): Promise<void>;
  deleteSub(id: string): Promise<void>;
}

export function createApi(getToken: GetToken): ApiMethods {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  async function request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const token = await getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchInit: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      fetchInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchInit);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const error = new ApiError(response.status, errorBody);
      // Toda falha de chamada abre o popup de erro; o throw continua para quem
      // já trata o erro inline na própria tela.
      publishErrorNotification(buildErrorDetails(error));
      throw error;
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  return {
    registerWallet: (body: RegisterWalletDto) =>
      request('/wallet', 'POST', body),

    buildDeposit: (amount: string) =>
      request('/deposit/build', 'POST', { amount }),

    submitDeposit: (body: SubmitTxDto) =>
      request('/deposit/submit', 'POST', body),

    buildWithdraw: (amount: string) =>
      request('/withdraw/build', 'POST', { amount }),

    submitWithdraw: (body: SubmitTxDto) =>
      request('/withdraw/submit', 'POST', body),

    getDashboard: () => request('/dashboard', 'GET'),

    getWalletBalance: () => request('/wallet/balance', 'GET'),

    listSubs: () => request('/subs', 'GET'),

    createSub: (body: CreateSubDto) => request('/subs', 'POST', body),

    reorderSubs: (body: ReorderSubsDto) => request('/subs/order', 'PATCH', body),

    deleteSub: (id: string) => request(`/subs/${id}`, 'DELETE'),
  };
}
