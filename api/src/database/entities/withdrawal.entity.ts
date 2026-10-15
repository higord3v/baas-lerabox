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

@Entity('withdrawals')
@Index('uq_withdrawals_user_reference', ['userId', 'externalReference'], {
  unique: true,
})
@Index('idx_withdrawals_user_status', ['userId', 'status'])
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'external_reference', type: 'varchar', length: 120 })
  externalReference: string

  @Index('uq_withdrawals_gateway_id', { unique: true })
  @Column({
    name: 'gateway_withdrawal_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  gatewayWithdrawalId: string | null

  @Column({ name: 'amount_cents', type: 'int', unsigned: true })
  amountCents: number

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: string

  @Column({ name: 'destination_type', type: 'varchar', length: 16 })
  destinationType: 'PIX' | 'BANK_ACCOUNT'

  @Column({ name: 'encrypted_destination', type: 'text', select: false })
  encryptedDestination: string

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
