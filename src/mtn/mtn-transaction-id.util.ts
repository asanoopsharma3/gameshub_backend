import { randomInt } from 'crypto';
import { MTN_REQUEST_TRANSACTION_ID_LENGTH } from './mtn.constants';

const MTN_TXN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 8-char alphanumeric id e.g. a1b2c3r4 for MTN request header transactionid. */
export function generateMtnRequestTransactionId(): string {
  let id = '';

  for (let i = 0; i < MTN_REQUEST_TRANSACTION_ID_LENGTH; i++) {
    id += MTN_TXN_CHARS[randomInt(0, MTN_TXN_CHARS.length)];
  }

  return id;
}

export function generateUniqueMtnRequestTransactionIds(count: number): string[] {
  const ids = new Set<string>();

  while (ids.size < count) {
    ids.add(generateMtnRequestTransactionId());
  }

  return [...ids];
}