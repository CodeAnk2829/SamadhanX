import { RedisClient } from "@repo/redis/client";

export const CREATED = "CREATED";
export const DELETED = "DELETED";
export const DELEGATED = "DELEGATED";
export const ESCALATED = "ESCALATED";
export const UPDATED = "UPDATED";
export const UPVOTED = "UPVOTED";


type WsMessage = {
    type: typeof CREATED,
    data: {
        complaintId: string,
        title: string,
        isAssignedTo: string,
    }
} | {
    type: typeof DELETED,
    data: {
        complaintId: string,
        title: string,
        wasAssignedTo: string,
    }
} | {
    type: typeof ESCALATED,
    data: {
        complaintId: string,
        title: string,
        wasAssignedTo: string,
        isAssignedTo: string,
        inchargeName: string,
        designation: string
    }
} | {
    type: typeof UPDATED,
    data: {
        complaintId: string,
        title: string,
        description: string,
        access: string,
        postAsAnonymous: boolean,
        status: typeof UPDATED,
        isAssignedTo: string,
        attachments: object[],
        tags: object[],
        updatedAt: Date,
    }
} | {
    type: typeof UPVOTED,
    data: {
        complaintId: string,
        title: string,
        upvotes: number,
        hasUpvoted: boolean,
        isAssignedTo: string,
    }
}

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
