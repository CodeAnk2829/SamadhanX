import { RedisClient } from "@repo/redis/client";
import { WsMessage } from "@repo/types/wsMessageTypes";

export class RedisManager {
    private publisher: Promise<RedisClient>;
    private static instance: RedisManager;

    constructor() {
        this.publisher = RedisClient.getInstance();
        const isConnected = RedisClient.isRedisConnected();

        if (!isConnected) {
            console.error;
        }
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public async publishMessage(channel: string, message: WsMessage) {
        (await this.publisher).publish(channel, JSON.stringify(message));
    }
}
