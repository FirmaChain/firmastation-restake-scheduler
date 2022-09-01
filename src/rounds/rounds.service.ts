import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { RoundsDto } from 'src/dtos/rounds.dto';
import { Rounds, RoundsDocument } from '../schemas/rounds.schema';

@Injectable()
export class RoundsService {
  constructor(@InjectModel(Rounds.name) private readonly roundsModel: Model<RoundsDocument>) {}

  async create(roundsDto: RoundsDto): Promise<Rounds> {
    return await this.roundsModel.create(roundsDto);
  }

  async findOne(round: number): Promise<Rounds> {
    return await this.roundsModel.findOne({ round: round }).exec();
  }

  async count(): Promise<number> {
    return await this.roundsModel.count();
  }
}
