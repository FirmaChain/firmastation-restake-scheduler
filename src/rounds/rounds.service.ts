import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateRoundsDto } from '../dtos/rounds.dto';
import { Rounds, RoundsDocument } from '../schemas/rounds.schema';

@Injectable()
export class RoundsService {
  constructor(@InjectModel(Rounds.name) private readonly roundsModel: Model<RoundsDocument>) {}

  async create(createRoundsDto: CreateRoundsDto): Promise<Rounds> {
    return await this.roundsModel.create(createRoundsDto);
  }

  async findOne(round: number): Promise<Rounds> {
    return await this.roundsModel.findOne({ round: round }).exec();
  }

  async count(): Promise<number> {
    return await this.roundsModel.count();
  }
}
