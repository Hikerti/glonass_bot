import {ChannelJobData} from "./forwarding.service";

export abstract class AbstractNotificationService {
    public abstract send(data: ChannelJobData): Promise<void>;
}