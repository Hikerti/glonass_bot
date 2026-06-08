import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PostType {
    TG = 'tg',
    TG2 = 'tg2',
    TG3 = 'tg3',
    MAIL = 'mail',
    MAIL2 = 'mail2',
    MAIL3 = 'mail3',
    VK = 'vk',
    VK2 = 'vk2'
}

@Entity({ name: 'posts' })
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: PostType,
    })
    type: PostType;

    @Column()
    text: string;

    @Column()
    interval: string;

    @Column()
    // Legacy database field: this value is the mailing end date.
    date: string;

    @Column({ name: 'start_date', nullable: true, type: 'varchar' })
    startDate: string | null;

    @Column('text', { array: true, default: [] })
    media: string[];

    @Column('uuid', { name: 'target_user_ids', array: true, default: [] })
    targetUserIds: string[];

    @Column({ default: false })
    active: boolean;

    @Column({name: 'post_to_wall', default: false })
    postToWall: boolean

    @Column({name: 'post_to_message', default: false })
    postToMessage: boolean

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
