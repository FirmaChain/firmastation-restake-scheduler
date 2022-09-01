import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoundsDto } from 'src/dtos/rounds.dto';

import { LatestRounds, LatestRoundsDocument } from 'src/schemas/latestRounds.schema';

@Injectable()
export class LatestRoundsService {
  constructor(@InjectModel(LatestRounds.name) private readonly latestRoundsModel: Model<LatestRoundsDocument>) {}

  async createAndUpdate(latestRoundsDto: RoundsDto): Promise<LatestRounds> {
    const count = await this.count();
    if (count === 0) {
      await this.create(latestRoundsDto);
    } else {
      await this.update(latestRoundsDto);
    }

    return null;
  }

  private async create(latestRoundsDto: RoundsDto): Promise<LatestRounds> {
    return await this.latestRoundsModel.create(latestRoundsDto);
  }

  private async update(latestRoundsDto: RoundsDto): Promise<LatestRounds> {
    return await this.latestRoundsModel.findOneAndUpdate({}, latestRoundsDto);
  }

  private async count(): Promise<number> {
    let count = await this.latestRoundsModel.count();
    if (count === null || count === undefined) {
      return 0;
    }

    return count;
  }
}
