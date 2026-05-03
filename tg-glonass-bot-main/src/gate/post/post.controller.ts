import {Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query} from '@nestjs/common';
import {PostService} from "./post.service";
import {PostDTO, PostType} from "@domains";


@Controller('posts')
export class PostController {
    constructor(private readonly postService: PostService) {}

    @Get(':id')
    async findById(@Param('id') id: string): Promise<PostDTO | null> {
        return this.postService.findById(id);
    }

    @Get()
    async getList(
        @Query('page', ParseIntPipe) page = 1,
        @Query('limit', ParseIntPipe) limit = 10,
        @Query('type') type?: PostType,
    ): Promise<{ items: PostDTO[]; total: number; page: number; limit: number }> {
        return this.postService.getListUsers(page, limit, type);
    }

    @Post()
    async create(@Body() dto: PostDTO.Create): Promise<PostDTO> {
        return this.postService.create(dto);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: PostDTO.Update
    ): Promise<PostDTO> {
        return this.postService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string): Promise<PostDTO> {
        return this.postService.delete(id);
    }
}
