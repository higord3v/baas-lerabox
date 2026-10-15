import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../database/entities/user.entity.js'
import { UserRepositoryPort } from './user-repository.interface.js'

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findByEmail(email: string, includePassword = false): Promise<User | null> {
    if (includePassword) {
      return this.users.createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email })
        .getOne()
    }
    return this.users.findOne({ where: { email } })
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } })
  }

  async create(input: Pick<User, 'email' | 'displayName' | 'passwordHash'>): Promise<User> {
    return this.users.save(this.users.create(input))
  }
}
