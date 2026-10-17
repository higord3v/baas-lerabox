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

@Entity('webhook_events')
@Index('uq_webhook_events_user_event_key', ['userId', 'eventKey'], {
  unique: true,
})
@Index('idx_webhook_events_user_reference', ['userId', 'externalReference'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>

  @Column({ name: 'event_key', type: 'varchar', length: 128 })
  eventKey: string

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL'

  @Column({
    name: 'external_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  externalReference: string | null

  @Column({ type: 'json' })
  payload: Record<string, unknown>

  @Column({ name: 'signature_valid', type: 'boolean', default: false })
  signatureValid: boolean

  @Column({
    name: 'processing_status',
    type: 'varchar',
    length: 16,
    default: 'RECEIVED',
  })
  processingStatus: 'RECEIVED' | 'PROCESSED' | 'FAILED'

  @Column({
    name: 'processed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  processedAt: Date | null

  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorMessage: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
