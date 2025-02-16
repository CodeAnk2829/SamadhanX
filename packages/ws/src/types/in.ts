
export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";
export const INCHARGE = "INCHARGE";
export const RESOLVER = "RESOLVER";
export const ADMIN = "ADMIN";
export const USER = "USER";

export type SubscribeMessage = {
    method: typeof SUBSCRIBE,
    role: typeof INCHARGE | typeof RESOLVER | typeof ADMIN | typeof USER,
    params: string[]
}

export type UnsubscribeMessage = {
    method: typeof UNSUBSCRIBE,
    params: string[]
}

export type IncomingMessage = SubscribeMessage | UnsubscribeMessage;