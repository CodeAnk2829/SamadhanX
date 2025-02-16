import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, {userId: string, role: string}[]> = new Map();
    private redisClient: RedisClientType;

    private constructor() {
        this.redisClient = createClient();
        this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribe(userId: string, role: string, subscription: string) {
        const user = {
            userId,
            role
        }
        console.log("Subscribing in SubscriptionManager");
        console.log("subscription: " + subscription);
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            return
        }

        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));
        this.reverseSubscriptions.set(subscription, (this.reverseSubscriptions.get(subscription) || []).concat(user));
        this.reverseSubscriptions.forEach((value, key) => {
            console.log(key, value);
        });

        if (this.reverseSubscriptions.get(subscription)?.length === 1) {

            this.redisClient.subscribe(subscription, this.redisCallbackHandler);
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        console.log("Received message from redis");
        console.log(parsedMessage);

        // find all the users who are INCHARGE or OTHERS
        // All the clients from OTHERS role will get the messages while only that incharge will
        // get the message who is responsible for that complaint
        const incharges = this.reverseSubscriptions.get(channel)?.filter(user => user.role === "INCHARGE");
        const users = this.reverseSubscriptions.get(channel)?.filter(user => user.role === "USER");

        console.log("Valid Incharges");
        const validIncharges = incharges?.filter(incharge => incharge.userId === parsedMessage.data.isAssignedTo || incharge.userId === parsedMessage.data.wasAssignedTo);
        console.log(validIncharges);

        console.log("Users");
        users?.forEach(user => {
            console.log(user);
        });

        users?.forEach(user => UserManager.getInstance().getUser(user.userId)?.emit(parsedMessage));
        validIncharges?.forEach(incharge => UserManager.getInstance().getUser(incharge.userId)?.emit(parsedMessage));
        // this.reverseSubscriptions.get(channel)?.forEach(user => UserManager.getInstance().getUser(user.userId)?.emit(parsedMessage));
    }

    public unsubscribe(userId: string, subscription: string) {
        console.log("Unsubscribing in SubscriptionManager");
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));
        }
        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter(s => s.userId !== userId));
            if (this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
            console.log("Reverse Subscriptions");
            this.reverseSubscriptions.forEach((value, key) => {
                console.log(key, value);
            });
        }
    }

    public userLeft(userId: string) {
        console.log("user left " + userId);
        this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId, s));
    }

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
}