import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateHistoriesDto } from '../dtos/histories.dto';
import { Histories, HistoriesDocument } from '../schemas/histories.schema';

@Injectable()
export class HistoriesService {
  constructor(@InjectModel(Histories.name) private readonly historiesModel: Model<HistoriesDocument>) {}

  async create(createHistoriesDto: CreateHistoriesDto): Promise<Histories> {
    const createHistories = await this.historiesModel.create(createHistoriesDto);
    return createHistories;
  }

  async findAll(): Promise<Histories[]> {
    return await this.historiesModel.find().exec();
  }

  async findOne(round: number): Promise<Histories> {
    return await this.historiesModel.findOne({ round: round }).exec();
  }

  async getCount(): Promise<number> {
    return await this.historiesModel.count({});
  }
}
