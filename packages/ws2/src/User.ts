import { WebSocket } from "ws";
import { OutgoingMessage } from "./types/out";
import { SubscriptionManager } from "./SubscriptionManager";
import { IncomingMessage, SUBSCRIBE, UNSUBSCRIBE } from "./types/in";

export class User {
    private id: string;
    private role: string;
    private message: string;
    private ws: WebSocket;

    constructor(id: string, role: string, message: string, ws: WebSocket) {
        this.id = id;
        this.role = role;
        this.message = message;
        this.ws = ws;
        this.addListeners();
    }

    private subscriptions: string[] = [];

    public subscribe(subscription: string) {
        this.subscriptions.push(subscription);
    }

    public unsubscribe(subscription: string) {
        this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    }

    emit(message: OutgoingMessage) {
        this.ws.send(JSON.stringify(message));
    }

    private addListeners() {
        console.log("Subscribing in User");
        const parsedMessage: IncomingMessage = JSON.parse(this.message);
        if (parsedMessage.method === SUBSCRIBE) {
            parsedMessage.params.forEach(s => SubscriptionManager.getInstance().subscribe(this.id, this.role, s));
        }

        if (parsedMessage.method === UNSUBSCRIBE) {
            parsedMessage.params.forEach(s => SubscriptionManager.getInstance().unsubscribe(this.id, parsedMessage.params[0]));
        }
    }

}