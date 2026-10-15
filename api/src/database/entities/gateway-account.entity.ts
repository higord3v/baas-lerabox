import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm'
import { User } from './user.entity.js'

@Entity('gateway_accounts')
export class GatewayAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index('uq_gateway_accounts_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Index('uq_gateway_accounts_customer_code', { unique: true })
  @Column({ name: 'customer_code', type: 'varchar', length: 100 })
  customerCode: string

  @Column({ name: 'store_key', type: 'text', select: false })
  encryptedStoreKey: string

  @Column({
    name: 'encrypted_access_token',
    type: 'text',
    nullable: true,
    select: false,
  })
  encryptedAccessToken: string | null

  @Column({
    name: 'token_expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  tokenExpiresAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
