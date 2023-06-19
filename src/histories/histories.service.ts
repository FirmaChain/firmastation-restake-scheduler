import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Histories, HistoriesDocument } from './histories.schema';
import { HistoriesDto } from './histories.interface';


@Injectable()
export class HistoriesService {
  constructor(@InjectModel(Histories.name) private readonly historiesModel: Model<HistoriesDocument>) {}

  async create(historiesDto: HistoriesDto): Promise<Histories> {
    return await this.historiesModel.create(historiesDto);
  }

  async findOne(round: number): Promise<Histories> {
    return await this.historiesModel.findOne({ round: round }).exec();
  }

  async count(): Promise<number> {
    return await this.historiesModel.count();
  }
}
