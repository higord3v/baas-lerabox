import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  type Relation,
} from 'typeorm'
import { User } from './user.entity.js'
import { Order } from './order.entity.js'

@Entity('checkout_links')
@Index('uq_checkout_links_user_reference', ['userId', 'externalReference'], {
  unique: true,
})
@Index('idx_checkout_links_user_status', ['userId', 'status'])
export class CheckoutLink {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'external_reference', type: 'varchar', length: 120 })
  externalReference: string

  @Column({ name: 'amount_cents', type: 'int', unsigned: true })
  amountCents: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null

  @Column({ type: 'varchar', length: 16 })
  method: 'PIX' | 'CARD'

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED'

  @Column({ name: 'card_brand', type: 'varchar', length: 32, nullable: true })
  cardBrand: string | null

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  installments: number | null

  @Column({
    name: 'fee_percent',
    type: 'decimal',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  feePercent: string | null

  @Column({
    name: 'expires_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  expiresAt: Date | null

  @OneToMany(() => Order, (order) => order.checkoutLink)
  orders: Relation<Order[]>

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
