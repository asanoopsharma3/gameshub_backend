/** Static subscription body — make dynamic via API later. MSISDN stays in URL per request. */
export const MTN_SUBSCRIPTION_PAYLOAD = {
  subscriptionId: '268012000007097',
  subscriptionProviderId: 'CSM',
  subscriptionName: 'Daily Pack',
  registrationChannel: 'WAP',
  subscriptionPaymentSource: 'Airtime',
  sendSMSNotification: 'true',
  'auto-renew': 'true',
} as const;

export const MTN_UPLOAD_DIR = 'storage/uploads/mtn';
export const MTN_ENQUEUE_CHUNK_SIZE = 500;
export const MTN_QUEUE_CHUNK_SIZE = 10;
export const MTN_QUEUE_INTERVAL_MS = 5000;
export const MTN_QUEUE_ENABLED = true;
