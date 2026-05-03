import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import {PostRepository} from "./post.repository";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Post} from "@domains";

@Module({
    imports: [
        TypeOrmModule.forFeature([Post]),
    ],
  providers: [PostService, PostRepository],
  controllers: [PostController]
})
export class PostModule {}
