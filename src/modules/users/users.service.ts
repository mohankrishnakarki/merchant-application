import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }
  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
