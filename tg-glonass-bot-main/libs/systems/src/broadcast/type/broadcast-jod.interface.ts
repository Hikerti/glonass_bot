import {PostDTO} from "@domains";

export interface BroadcastJobData extends PostDTO {
    chatId: string;
}