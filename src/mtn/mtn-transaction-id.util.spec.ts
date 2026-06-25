import {
  generateMtnRequestTransactionId,
  generateUniqueMtnRequestTransactionIds,
} from './mtn-transaction-id.util';
import { MTN_REQUEST_TRANSACTION_ID_LENGTH } from './mtn.constants';

describe('mtn-transaction-id.util', () => {
  it('generates 8-char lowercase hex ids', () => {
    const id = generateMtnRequestTransactionId();
    expect(id).toHaveLength(MTN_REQUEST_TRANSACTION_ID_LENGTH);
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('generates unique ids for a batch', () => {
    const ids = generateUniqueMtnRequestTransactionIds(100);
    expect(ids).toHaveLength(100);
    expect(new Set(ids).size).toBe(100);
  });
});
