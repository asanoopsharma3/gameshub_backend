/** Static subscription body fields. MSISDN is in the URL; subscriptionId comes from Excel plan_id. */
export const MTN_SUBSCRIPTION_PAYLOAD = {
  subscriptionProviderId: 'CSM',
  subscriptionName: 'gameshub',
  registrationChannel: 'WAP',
  subscriptionPaymentSource: 'Airtime',
  sendSMSNotification: 'false',
  'auto-renew': 'true',
} as const;

/** Request header transactionid length (hex string e.g. a1b2c3c7). */
export const MTN_REQUEST_TRANSACTION_ID_LENGTH = 8;

export const MTN_UPLOAD_DIR = 'storage/uploads/mtn';
export const MTN_ENQUEUE_CHUNK_SIZE = 500;
export const MTN_QUEUE_CHUNK_SIZE = 10;
export const MTN_QUEUE_INTERVAL_MS = 5000;
export const MTN_QUEUE_ENABLED = true;
