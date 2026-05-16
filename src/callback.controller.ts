import { Controller, Get, Query } from '@nestjs/common';
import { CallbackService } from './callback.service';
import { resolveCallbackObjectsFromQuery } from './callback-payload.util';

@Controller('callback')
export class CallbackController {
  constructor(private readonly callbackService: CallbackService) {}

  /**
   * GET only — all input via query parameters:
   * - Flat params and/or JSON in any param (`data`, `code`, etc.).
   * - Partner format: `?code=268012...","sequenceNumber":"...","data":{...},...`
   * - Top-level values win; missing fields fall back to `data.<field>`.
   * - Duplicate `requestNo` rows are always inserted (no skip).
   */
  @Get()
  async callback(
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    const objects = resolveCallbackObjectsFromQuery(query);
    const result = await this.callbackService.insertFromPayloads(objects);
    return { ok: true, ...result };
  }
}
