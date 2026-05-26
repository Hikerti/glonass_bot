import {IsArray, IsBoolean, IsOptional, IsString} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import {Post, PostType} from "./posts.entites";

export class PostDTO {
    @IsString()
    id: string;

    @IsString()
    type: PostType;

    @IsString()
    text: string;

    @IsString()
    interval: string;

    @IsString()
    // Legacy API name: this value is the mailing end date.
    date: string;

    @IsArray()
    @IsString({ each: true })
    media: string[];

    @IsBoolean()
    active: boolean;

    @IsBoolean()
    @IsOptional()
    postToWall?: boolean;

    @IsBoolean()
    @IsOptional()
    postToMessage?: boolean;

    @IsString()
    createdAt: string;

    static fromModel(model: Post): PostDTO {
        const dateToString = (dateInput: Date | string) => {
            const dateObject = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
            return dateObject.toISOString();
        };

        return {
            id: model.id,
            type: model.type,
            text: model.text,
            interval: model.interval,
            date: model.date,
            media: model.media,
            active: model.active,
            postToWall: model.postToWall,
            postToMessage: model.postToMessage,
            createdAt: dateToString(model.createdAt),
        }
    }
}

export namespace PostDTO {
    export class Create extends OmitType(PostDTO, ['id', 'createdAt'] as const) {}
    export class Update extends PartialType(Create) {}
}
