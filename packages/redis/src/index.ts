import { createClient, RedisClientType } from "redis";

export class RedisClient {
    private static instance: RedisClient;
    private client: ReturnType<typeof createClient>;
    private static connected: boolean = false;
    private static MAX_RETRIES = 5;
    private static RETRY_DELAY = 5000;

    private constructor() {
        this.client = createClient({
            url: "redis://localhost:6379"
        });

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
            RedisClient.connected = false;
        });

        this.client.on('connect', () => {
            console.log('Redis Client Connected');
            RedisClient.connected = true;
        });
    }

    public static async getInstance(): Promise<RedisClient> {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
            await RedisClient.instance.connect();
        } else if (!RedisClient.connected) {
            await RedisClient.instance.reconnect();
        }
        return RedisClient.instance;
    }

    private async connect() {
        try {
            await this.client.connect();
        } catch (err) {
            console.error('Failed to connect to Redis:', err);
            throw err;
        }
    }

    private async reconnect(retryCount = 0) {
        try {
            if (!RedisClient.connected && retryCount < RedisClient.MAX_RETRIES) {
                console.log(`Attempting to reconnect to Redis (${retryCount + 1}/${RedisClient.MAX_RETRIES})`);
                await this.client.disconnect();
                await new Promise(resolve => setTimeout(resolve, RedisClient.RETRY_DELAY));
                await this.connect();
            }
        } catch (err) {
            if (retryCount < RedisClient.MAX_RETRIES) {
                await this.reconnect(retryCount + 1);
            } else {
                throw new Error('Max Redis reconnection attempts reached');
            }
        }
    }

    public static isRedisConnected(): boolean {
        return RedisClient.connected;
    }

    // Wrap Redis commands with reconnection logic
    public async lPush(key: string, value: string): Promise<number> {
        try {
            return await this.client.lPush(key, value);
        } catch (err) {
            await this.reconnect();
            return await this.client.lPush(key, value);
        }
    }

    public async blMove(source: any, destination: any, from: any, to: any, timeout: any): Promise<any | null> {
        try {
            return await this.client.blMove(source, destination, from, to, timeout);
        } catch (err) {
            await this.reconnect();
            return await this.client.blMove(source, destination, from, to, timeout);
        }
    }

    public async lIndex(key: string, index: number): Promise<string | null> {
        try {
            return await this.client.lIndex(key, index);
        } catch (err) {
            await this.reconnect();
            return await this.client.lIndex(key, index);
        }
    }

    public async lRem(key: string, count: number, value: string): Promise<number> {
        try {
            return await this.client.lRem(key, count, value);
        } catch (err) {
            await this.reconnect();
            return await this.client.lRem(key, count, value);
        }
    }
}