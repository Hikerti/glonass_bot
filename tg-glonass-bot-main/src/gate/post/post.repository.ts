import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import {PostDTO, Post, PostType} from "@domains";
import { PaginationType } from "@shared";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class PostRepository {
    constructor(
        @InjectRepository(Post)
        private readonly postRepository: Repository<Post>,
    ) {}

    async create(postData: PostDTO.Create): Promise<PostDTO> {
        const postEntity = this.postRepository.create({
            type: postData.type as PostType,
            text: postData.text,
            interval: postData.interval,
            date: postData.date,
            startDate: postData.startDate ?? null,
            media: postData.media || [],
            attachments: postData.attachments || [],
            targetUserIds: postData.targetUserIds || [],
            postToWall: postData.postToWall,
            postToMessage: postData.postToMessage,
            active: postData.active,
        });

        const post = await this.postRepository.save(postEntity);

        return PostDTO.fromModel(post);
    }

    async findById(id: string): Promise<PostDTO> {
        const post = await this.getPost(id);
        return post;
    }

    async update(id: string, postData: PostDTO.Update): Promise<PostDTO> {
        const existingPost = await this.postRepository.findOneBy({ id });

        if (!existingPost) {
            throw new NotFoundException({ error: 'Post not found' });
        }

        this.postRepository.merge(existingPost, {
            type: postData.type as PostType,
            text: postData.text,
            interval: postData.interval,
            date: postData.date,
            startDate: postData.startDate,
            media: postData.media,
            attachments: postData.attachments,
            targetUserIds: postData.targetUserIds,
            active: postData.active,
            postToWall: postData.postToWall,
            postToMessage: postData.postToMessage,
        });

        const post = await this.postRepository.save(existingPost);

        return PostDTO.fromModel(post);
    }

    async delete(id: string): Promise<PostDTO> {
        const postToDelete = await this.postRepository.findOneBy({ id });

        if (!postToDelete) {
            throw new NotFoundException({ error: 'Post not found' });
        }

        await this.postRepository.delete(id);

        return PostDTO.fromModel(postToDelete);
    }

    async getList(page: number = 1, limit: number = 10, type?: PostType): Promise<PaginationType<PostDTO>> {
        const skip = (page - 1) * limit;

        const [items, total] = await this.postRepository.findAndCount({
            where: type ? { type } : {},
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
        });

        const isLast = (page * limit) >= total;

        return {
            items: items.map(PostDTO.fromModel),
            total,
            page,
            isLast,
            limit,
        };
    }

    async getPost(id: string): Promise<PostDTO> {
        const post = await this.postRepository.findOneBy({ id });

        if (!post) {
            throw new NotFoundException({ error: 'Post not found' });
        }

        return PostDTO.fromModel(post);
    }
}
