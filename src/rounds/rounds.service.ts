import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateRoundsDto } from '../dtos/rounds.dto';
import { Rounds, RoundsDocument } from '../schemas/rounds.schema';

@Injectable()
export class RoundsService {
  constructor(@InjectModel(Rounds.name) private readonly roundsModel: Model<RoundsDocument>) {}

  async create(createRoundsDto: CreateRoundsDto): Promise<Rounds> {
    const createdRounds = await this.roundsModel.create(createRoundsDto);
    return createdRounds;
  }

  async findAll(): Promise<Rounds[]> {
    return this.roundsModel.find().exec();
  }

  async findOne(round: number): Promise<Rounds> {
    return await this.roundsModel.findOne({ round: round }).exec();
  }

  async findLatest(): Promise<Rounds> {
    const roundData = await this.roundsModel.find().sort({ round: -1 }).limit(1);
    return roundData[0];
  }

  async findLatestAt(count: number): Promise<Rounds[]> {
    const roundData = await this.roundsModel.find().sort({ round: -1 }).limit(count);
    return roundData;
  }
}
