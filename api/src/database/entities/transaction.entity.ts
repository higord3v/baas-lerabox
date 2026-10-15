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
import { Order } from './order.entity.js'
import { User } from './user.entity.js'

@Entity('transactions')
@Index('uq_transactions_user_gateway_id', ['userId', 'gatewayTransactionId'], {
  unique: true,
})
@Index('idx_transactions_user_status', ['userId', 'status'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'order_id', type: 'varchar', length: 36, nullable: true })
  orderId: string | null

  @ManyToOne(() => Order, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order> | null

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 120 })
  gatewayTransactionId: string

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  externalReference: string | null

  @Column({ name: 'amount_cents', type: 'int', unsigned: true })
  amountCents: number

  @Column({ type: 'varchar', length: 32 })
  type: string

  @Column({ type: 'varchar', length: 32 })
  status: string

  @Column({ name: 'occurred_at', type: 'datetime', precision: 6 })
  occurredAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
