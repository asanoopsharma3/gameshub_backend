import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallbackTransaction } from '../entities/callback-transaction.entity';
import { MtnSubscriptionBatch } from '../entities/mtn-subscription-batch.entity';
import { MtnSubscriptionQueue } from '../entities/mtn-subscription-queue.entity';
import { MtnTokenCache } from '../entities/mtn-token-cache.entity';
import { MtnAuthService } from './mtn-auth.service';
import { MtnBatchService } from './mtn-batch.service';
import { MtnController } from './mtn.controller';
import { MtnExcelService } from './mtn-excel.service';
import { MtnQueueProcessor } from './mtn-queue.processor';
import { MtnQueueService } from './mtn-queue.service';
import { MtnSubscriptionService } from './mtn-subscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MtnSubscriptionBatch,
      MtnSubscriptionQueue,
      MtnTokenCache,
      CallbackTransaction,
    ]),
  ],
  controllers: [MtnController],
  providers: [
    MtnAuthService,
    MtnSubscriptionService,
    MtnExcelService,
    MtnBatchService,
    MtnQueueService,
    MtnQueueProcessor,
  ],
})
export class MtnModule {}
