import { Injectable } from '@nestjs/common';
import {PostRepository} from "./post.repository";
import {PostDTO, PostType} from "@domains";
import {PaginationType} from "@shared";

@Injectable()
export class PostService {
    constructor(private readonly postRepository: PostRepository) {}

    async findById(id: string): Promise<PostDTO | null> {
        return await this.postRepository.findById(id);
    }

    async getListUsers(page: number, limit: number, type?: PostType): Promise<PaginationType<PostDTO>> {
        return await this.postRepository.getList(page, limit, type)
    }

    async create(dto: PostDTO.Create): Promise<PostDTO> {
        return await this.postRepository.create(dto);
    }

    async update(id: string, dto: PostDTO.Update): Promise<PostDTO> {
        return await this.postRepository.update(id, dto);
    }

    async delete(id: string): Promise<PostDTO> {
        return await this.postRepository.delete(id);
    }
}
