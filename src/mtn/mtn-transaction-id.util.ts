import { randomBytes } from 'crypto';
import { MTN_REQUEST_TRANSACTION_ID_LENGTH } from './mtn.constants';

/** 8-char hex id e.g. a1b2c3c7 for MTN request header transactionid. */
export function generateMtnRequestTransactionId(): string {
  return randomBytes(MTN_REQUEST_TRANSACTION_ID_LENGTH / 2).toString('hex');
}

export function generateUniqueMtnRequestTransactionIds(count: number): string[] {
  const ids = new Set<string>();
  while (ids.size < count) {
    ids.add(generateMtnRequestTransactionId());
  }
  return [...ids];
}
