export const CREATED = "CREATED";
export const DELETED = "DELETED";
export const DELEGATED = "DELEGATED";
export const ESCALATED = "ESCALATED";
export const UPDATED = "UPDATED";
export const UPVOTED = "UPVOTED";

export type WsMessage = {
    type: typeof CREATED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
        title: string,
        isAssignedTo: string,
    }
} | {
    type: typeof DELETED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
        title: string,
        wasAssignedTo: string,
    }
} | {
    type: typeof DELEGATED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
        title: string,
        isAssignedTo: string,
        delegatedTo: string,
        resolverName: string,
        occupation: string,
        delegatedAt: Date
    }
} | {
    type: typeof ESCALATED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
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
        complainerId: string,
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
        complainerId: string,
        access: string,
        title: string,
        upvotes: number,
        hasUpvoted: boolean,
        isAssignedTo: string,
    }
}
