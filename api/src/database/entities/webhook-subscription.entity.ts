import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm'
import { User } from './user.entity.js'

@Entity('webhook_subscriptions')
@Index('uq_webhook_subscriptions_user_event', ['userId', 'eventType'], { unique: true })
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL'

  @Column({ name: 'callback_url', type: 'varchar', length: 2048 })
  callbackUrl: string

  @Column({ name: 'encrypted_secret', type: 'text', select: false })
  encryptedSecret: string

  @Column({ name: 'registered_at', type: 'datetime', precision: 6, nullable: true })
  registeredAt: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
