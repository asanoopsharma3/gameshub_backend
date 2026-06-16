import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import {
  MtnSubscriptionBatch,
  MtnBatchStatus,
} from '../entities/mtn-subscription-batch.entity';
import { MtnSubscriptionQueue } from '../entities/mtn-subscription-queue.entity';
import { MtnExcelService } from './mtn-excel.service';
import { MTN_ENQUEUE_CHUNK_SIZE } from './mtn.constants';
import {
  resolveStoragePath,
  toRelativeStoragePath,
} from './mtn-storage.util';

const MAX_MSISDN_PER_BATCH = 20000;

@Injectable()
export class MtnBatchService {
  private readonly logger = new Logger(MtnBatchService.name);

  constructor(
    private readonly excelService: MtnExcelService,
    @InjectRepository(MtnSubscriptionBatch)
    private readonly batchRepo: Repository<MtnSubscriptionBatch>,
    @InjectRepository(MtnSubscriptionQueue)
    private readonly queueRepo: Repository<MtnSubscriptionQueue>,
  ) {}

  async createBatchFromUpload(
    file: Express.Multer.File,
  ): Promise<MtnSubscriptionBatch> {
    if (!file?.path) {
      throw new BadRequestException('No file uploaded');
    }

    const absolutePath = file.path;
    const storedPath = toRelativeStoragePath(absolutePath);

    const msisdns = this.excelService.readMsisdnsFromFile(absolutePath);
    if (msisdns.length > MAX_MSISDN_PER_BATCH) {
      fs.unlinkSync(absolutePath);
      throw new BadRequestException(
        `Maximum ${MAX_MSISDN_PER_BATCH} MSISDNs allowed per upload`,
      );
    }

    const batch = await this.batchRepo.save({
      originalFilename: file.originalname,
      filePath: storedPath,
      totalCount: msisdns.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      status: 'pending' as MtnBatchStatus,
    });

    await this.enqueueMsisdns(batch.id, msisdns);

    this.logger.log(
      `Batch ${batch.id} saved file=${storedPath} msisdns=${msisdns.length}`,
    );

    return this.getBatch(batch.id);
  }

  async startSubscription(batchId: string): Promise<MtnSubscriptionBatch> {
    const batch = await this.getBatch(batchId);

    if (batch.status === 'processing') {
      throw new BadRequestException(`Batch ${batchId} is already processing`);
    }

    if (batch.status === 'completed') {
      throw new BadRequestException(`Batch ${batchId} is already completed`);
    }

    const fileAbsolute = resolveStoragePath(batch.filePath);
    if (!fs.existsSync(fileAbsolute)) {
      throw new BadRequestException(
        `Stored Excel file not found: ${batch.filePath}`,
      );
    }

    await this.batchRepo.update(batchId, { status: 'processing' });

    this.logger.log(`Batch ${batchId} subscription started`);

    return this.getBatch(batchId);
  }

  resolveBatchFilePath(batch: MtnSubscriptionBatch): string {
    return resolveStoragePath(batch.filePath);
  }

  private async enqueueMsisdns(
    batchId: string,
    msisdns: string[],
  ): Promise<void> {
    for (let i = 0; i < msisdns.length; i += MTN_ENQUEUE_CHUNK_SIZE) {
      const slice = msisdns.slice(i, i + MTN_ENQUEUE_CHUNK_SIZE);
      const rows = slice.map((msisdn) => ({
        batchId,
        msisdn,
        transactionId: randomUUID(),
        status: 'pending' as const,
        attempts: 0,
        amountCharged: '0.00',
      }));

      await this.queueRepo.insert(rows);
    }
  }

  async getBatch(id: string): Promise<MtnSubscriptionBatch> {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    return batch;
  }

  async listBatches(limit = 20, offset = 0): Promise<MtnSubscriptionBatch[]> {
    return this.batchRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getBatchQueueSummary(batchId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const rows = await this.queueRepo
      .createQueryBuilder('q')
      .select('q.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('q.batch_id = :batchId', { batchId })
      .groupBy('q.status')
      .getRawMany<{ status: string; count: string }>();

    const summary = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const row of rows) {
      const key = row.status as keyof typeof summary;
      if (key in summary) summary[key] = parseInt(row.count, 10);
    }

    return summary;
  }

  async refreshBatchCounters(batchId: string): Promise<void> {
    const summary = await this.getBatchQueueSummary(batchId);
    const processed = summary.completed + summary.failed;
    const batch = await this.getBatch(batchId);

    let status: MtnBatchStatus = batch.status;
    if (summary.pending === 0 && summary.processing === 0) {
      status = summary.failed > 0 && summary.completed === 0 ? 'failed' : 'completed';
    } else if (summary.processing > 0 || summary.pending > 0) {
      status = 'processing';
    }

    await this.batchRepo.update(batchId, {
      processedCount: processed,
      successCount: summary.completed,
      failedCount: summary.failed,
      status,
    });
  }
}
