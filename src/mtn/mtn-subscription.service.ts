import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallbackTransaction } from '../entities/callback-transaction.entity';
import { MtnAuthService } from './mtn-auth.service';
import { MTN_SUBSCRIPTION_PAYLOAD } from './mtn.constants';

export type MtnSubscriptionResponse = {
  subscriptionName?: string;
  registrationChannel?: string;
  amountCharged?: number;
  sendSMSNotification?: boolean;
  autoRenew?: boolean;
  amountBefore?: number;
  amountAfter?: number;
  correlationId?: string;
  nonGSM?: boolean;
  status?: string;
  customerId?: string;
  cvmoffer?: boolean;
  statusCode?: string;
  statusMessage?: string;
};

export type MtnSubscriptionResult = {
  ok: boolean;
  statusCode: string | null;
  statusMessage: string | null;
  amountCharged: string;
  response: MtnSubscriptionResponse | Record<string, unknown> | null;
  errorMessage: string | null;
  transactionId: string;
};

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMoney(v: unknown): string {
  const n = Number(v);
  if (Number.isNaN(n)) return '0.00';
  return n.toFixed(2);
}

@Injectable()
export class MtnSubscriptionService {
  private readonly logger = new Logger(MtnSubscriptionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly authService: MtnAuthService,
    @InjectRepository(CallbackTransaction)
    private readonly callbackRepo: Repository<CallbackTransaction>,
  ) {}

  async subscribe(
    msisdn: string,
    transactionId: string,
  ): Promise<MtnSubscriptionResult> {
    const baseUrl = this.config.get<string>(
      'MTN_API_BASE_URL',
      'https://api.mtn.com',
    );
    const apiKey = this.config.get<string>('MTN_API_KEY');

    if (!apiKey) {
      throw new Error('MTN_API_KEY must be set in .env');
    }

    const token = await this.authService.getAccessToken();
    const url = `${baseUrl}/v2/customers/${msisdn}/subscriptions`;
    const payload = { ...MTN_SUBSCRIPTION_PAYLOAD };

    this.logger.debug(`MTN subscribe msisdn=${msisdn} transactionId=${transactionId}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          transactionid: transactionId,
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: MtnSubscriptionResponse | Record<string, unknown> | null = null;

      try {
        data = text ? (JSON.parse(text) as MtnSubscriptionResponse) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        const errorMessage =
          (data as MtnSubscriptionResponse)?.statusMessage ??
          `HTTP ${response.status}: ${text.slice(0, 500)}`;

        return {
          ok: false,
          statusCode: (data as MtnSubscriptionResponse)?.statusCode ?? String(response.status),
          statusMessage: errorMessage,
          amountCharged: '0.00',
          response: data,
          errorMessage,
          transactionId,
        };
      }

      const parsed = data as MtnSubscriptionResponse;
      const statusCode = parsed.statusCode ?? parsed.status ?? null;
      const isSuccess = statusCode === '0000';

      return {
        ok: isSuccess,
        statusCode,
        statusMessage: parsed.statusMessage ?? null,
        amountCharged: formatMoney(parsed.amountCharged ?? 0),
        response: parsed,
        errorMessage: isSuccess ? null : (parsed.statusMessage ?? 'Subscription failed'),
        transactionId,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`MTN subscribe error msisdn=${msisdn}: ${message}`);
      return {
        ok: false,
        statusCode: null,
        statusMessage: null,
        amountCharged: '0.00',
        response: null,
        errorMessage: message,
        transactionId,
      };
    }
  }

  async saveToCallbackTransaction(
    msisdn: string,
    transactionId: string,
    result: MtnSubscriptionResult,
  ): Promise<string> {
    const response = result.response as MtnSubscriptionResponse | null;
    const chargeAmount = result.amountCharged;
    const chargeNum = Number(chargeAmount);

    const entity = new CallbackTransaction();
    entity.serviceType = 'MTN_SUBSCRIPTION';
    entity.requestNo = transactionId;
    entity.logTime = new Date();
    entity.msisdn = msisdn;
    entity.callingParty = msisdn;
    entity.chargeAmount = chargeAmount;
    entity.code = result.statusCode;
    entity.result = result.statusMessage;
    entity.transactionId = response?.correlationId ?? transactionId;
    entity.requestedPlan = response?.subscriptionName ?? null;
    entity.appliededPlan = response?.subscriptionName ?? null;
    entity.operationId = 'SUBSCRIBE';
    entity.bearerId = MTN_SUBSCRIPTION_PAYLOAD.registrationChannel;
    entity.eventDate = todayDateString();
    entity.isChargeable = chargeNum > 0;
    entity.notificationType = 'MTN_API';

    const saved = await this.callbackRepo.save(entity);
    return saved.id;
  }
}
