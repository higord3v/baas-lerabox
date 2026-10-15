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
import { CheckoutLink } from './checkout-link.entity.js'
import { User } from './user.entity.js'

@Entity('orders')
@Index('uq_orders_user_reference', ['userId', 'externalReference'], {
  unique: true,
})
@Index('idx_orders_user_status', ['userId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'checkout_link_id', type: 'varchar', length: 36 })
  checkoutLinkId: string

  @ManyToOne(() => CheckoutLink, (link) => link.orders, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'checkout_link_id' })
  checkoutLink: Relation<CheckoutLink>

  @Column({ name: 'external_reference', type: 'varchar', length: 120 })
  externalReference: string

  @Index('uq_orders_gateway_payment_id', { unique: true })
  @Column({
    name: 'gateway_payment_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  gatewayPaymentId: string | null

  @Column({ name: 'amount_cents', type: 'int', unsigned: true })
  amountCents: number

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED'

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
