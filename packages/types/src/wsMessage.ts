export const ASSIGNED = "ASSIGNED";
export const CREATED = "CREATED";
export const CLOSED = "CLOSED";
export const DELETED = "DELETED";
export const DELEGATED = "DELEGATED";
export const ESCALATED = "ESCALATED";
export const RECREATED = "RECREATED";
export const RESOLVED = "RESOLVED";
export const UPDATED = "UPDATED";
export const UPVOTED = "UPVOTED";

export type WsMessage = {
    idemPotencyKey: string,
    type: typeof CREATED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
        title: string,
        isAssignedTo: string,
    }
} | {
    idemPotencyKey: string,
    type: typeof DELETED,
    data: {
        complaintId: string,
        complainerId: string,
        access: string,
        title: string,
        wasAssignedTo: string,
    }
} | {
    idemPotencyKey: string,
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
    idemPotencyKey: string,
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
    idemPotencyKey: string,
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
    idemPotencyKey: string,
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
} | {
    idemPotencyKey: string,
    type: typeof RESOLVED,
    data: {
        complaintId: string;
        complainerId: string;
        access: string;
        title: string;
        wasAssignedTo: string,
        inchargeName: string,
        resolverDetails: {
            id: string,
            name: string,
            email: string,
            phoneNumber: string,
        },
        resolvedAt: Date
    }
}
