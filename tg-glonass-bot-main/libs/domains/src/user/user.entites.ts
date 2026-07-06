import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

export enum UserRole {
    ADMIN = 'admin',
    CLIENT = 'client',
}

export enum UserTypeEmail {
  MAIL = 'mail',
  MAIL2 = 'mail2',
  MAIL3 = 'mail3',
  MAIL4 = 'mail4',
}

@Entity({ name: 'user' })
@Unique(['tgId'])
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({
        nullable: true,
        type: 'varchar'
    })
    email: string | null;

    @Column({
        nullable: true,
        type: 'varchar'
    })
    phone: string | null;

    @Column({
        nullable: true,
        type: 'text'
    })
    description: string | null;

    @Column({ name: 'tg_id', nullable: true, type: 'varchar' })
    tgId: string | null;

    @Column({ name: 'vk_id', nullable: true, type: 'varchar' })
    vkId: number | null;

    @Column({
        type: 'enum',
        enum: UserRole,
    })
    role: UserRole;

      @Column({
        type: 'enum',
        name: 'type_email',
        enum: UserTypeEmail,
        nullable: true,
    })
    typeEmail: UserTypeEmail | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
