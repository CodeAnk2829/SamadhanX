
export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";
export const INCHARGE = "INCHARGE";
export const USER = "USER";

export type SubscribeMessage = {
    method: typeof SUBSCRIBE,
    userId: string,
    role: typeof INCHARGE | typeof USER,
    params: string[]
}

export type UnsubscribeMessage = {
    method: typeof UNSUBSCRIBE,
    userId: string,
    role: typeof INCHARGE | typeof USER,
    params: string[]
}

export type IncomingMessage = SubscribeMessage | UnsubscribeMessage;