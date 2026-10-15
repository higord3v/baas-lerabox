import { User } from '../database/entities/user.entity.js'

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')

export interface UserRepositoryPort {
  findByEmail(email: string, includePassword?: boolean): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(input: Pick<User, 'email' | 'displayName' | 'passwordHash'>): Promise<User>
}
