import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { StatusesDto } from '../dtos/statuses.dto';
import { Statuses, StatusesDocument } from '../schemas/statuses.schema';

@Injectable()
export class StatusesService {
  constructor(@InjectModel(Statuses.name) private readonly statusModel: Model<StatusesDocument>) {}

  async create(createStatusesDto: StatusesDto): Promise<Statuses> {
    return await this.statusModel.create(createStatusesDto);
  }

  async findOne(): Promise<Statuses> {
    return this.statusModel.findOne().exec();
  }

  async update(updateStatusesDto: StatusesDto) {
    return await this.statusModel.findOneAndUpdate({}, updateStatusesDto);
  }
}