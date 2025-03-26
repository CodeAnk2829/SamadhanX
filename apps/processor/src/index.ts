import { prisma } from "@repo/db/client";
import { RedisClient } from "@repo/redis/client";
import { CREATED, DELEGATED, DELETED, ESCALATED, RESOLVED, UPDATED, UPVOTED } from "@repo/types/wsMessageTypes";

async function main() {
    const redisClient = await RedisClient.getInstance();
    startProcessor(redisClient);
}

main().catch(console.error);

export interface CreateComplaintPayload {
    complaintId: string;
    complainerId: string;
    access: string;
    title: string;
    isAssignedTo?: string;
    escalation_due_at: Date;
    locationId: number;
    rank: number;
}

export interface EscalateComplaintPayload {
    complaintId: String;
    title: String;
    inchargeId: String;
    locationId: number;
    rank: number;
}

export interface EscalatedComplaintPayload {
    complaintId: String;
    complainerId: String,
    access: String;
    title: String;
    wasAssignedTo: String;
    isAssignedTo: String;
    inchargeName: String;
    designation: String;
}

export interface UpdateComplaintPayload {
    complaintId: String;
    complainerId: String;
    title: String;
    description: String;
    access: String;
    postAsAnonymous: String;
    status: String;
    isAssignedTo: String;
    attachments: {
        id: String,
        imageUrl: String
    }[]
    tags: {
        tags: {
            tagName: String
        }
    }[]
    updatedAt: Date
}

export interface UpvoteComplaintPayload {
    complaintId: String;
    complainerId: String;
    access: String;
    title: String;
    upvotes: Number;
    hasUpvoted: Boolean;
    isAssignedTo: String;
}

export interface DeleteComplaintPayload {
    complaintId: String,
    complainerId: String,
    access: String;
    title: String;
    wasAssignedTo: String;
}

export interface DelegateComplaintPayload {
    complaintId: String;
    complainerId: String;
    access: String;
    title: String;
    isAssignedTo: String;
    delegatedTo: String;
    resolverName: String;
    occupation: String;
    delegatedAt: Date
}

export interface ResolveComplaintPayload {
    complaintId: String;
    complainerId: String;
    access: String;
    title: String;
    inchargeId: String,
    inchargeName: String,
    resolverDetails: {
        id: String,
        name: String,
        email: String,
        phoneNumber: String,
    },
    resolvedAt: Date
}

const BASE_DELAY = 1000;
const MAX_RETRIES = 5;


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100));

async function processWithExponentialBackOff(event: any, redisClient: RedisClient) {
    let attempt = 0;
    const idemPotencyKey = `${event.id}-${event.eventType}`;

    while (attempt < MAX_RETRIES) {
        try {
            switch (event.eventType) {

                case "complaint_created":
                    console.log("Entered into complaint-created case");
                    const creationPayload = event.payload as unknown as CreateComplaintPayload;

                    // first check whether this event has already published
                    const isCreatedEventPublished = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isCreatedEventPublished) {
                        // publish this event to 'creation' channel
                        await redisClient.publish("creation", JSON.stringify({
                            idemPotencyKey, // apply idempotency to avoid duplicate publication
                            type: CREATED,
                            data: {
                                complaintId: creationPayload.complaintId,
                                complainerId: creationPayload.complainerId,
                                access: creationPayload.access,
                                title: creationPayload.title,
                                isAssignedTo: creationPayload.isAssignedTo,
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const scheduleEscalation = prisma.complaintOutbox.create({
                        data: {
                            eventType: "complaint_escalation_due",
                            payload: {
                                complaintId: creationPayload.complaintId,
                                title: creationPayload.title,
                                inchargeId: creationPayload.isAssignedTo,
                                locationId: creationPayload.locationId,
                                rank: creationPayload.rank
                            },
                            status: "PENDING",
                            processAfter: creationPayload.escalation_due_at
                        }
                    });

                    
                    const markCreationAsProcessed = prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }   
                    });

                    const result = await prisma.$transaction([scheduleEscalation, markCreationAsProcessed]);
                    
                    if (!result) {
                        throw new Error("Escalation Schedule failed. Retrying...");
                    }

                    break;
                
                case "complaint_deleted": 
                    const deletionPayload = event.payload as unknown as DeleteComplaintPayload;

                    const isDeleteEventPublished = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isDeleteEventPublished) {
                        // publish this event to 'deletion' channel
                        await redisClient.publish("deletion", JSON.stringify({
                            idemPotencyKey,
                            type: DELETED,
                            data: {
                                complaintId: deletionPayload.complaintId,
                                complainerId: deletionPayload.complainerId,
                                access: deletionPayload.access,
                                title: deletionPayload.title,
                                wasAssignedTo: deletionPayload.wasAssignedTo
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markDeletionAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markDeletionAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }

                    break;

                case "complaint_delegated": 
                    console.log("entered into complaint_delegation case");
                    const delegationPayload = event.payload as unknown as DelegateComplaintPayload;

                    const isDelegateEventPublished = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isDelegateEventPublished) {
                        console.log("delegating complaint");
                        await redisClient.publish("delegation", JSON.stringify({
                            idemPotencyKey,
                            type: DELEGATED,
                            data: {
                                complaintId: delegationPayload.complaintId,
                                complainerId: delegationPayload.complainerId,
                                access: delegationPayload.access,
                                title: delegationPayload.title,
                                isAssignedTo: delegationPayload.isAssignedTo,
                                delegatedTo: delegationPayload.delegatedTo,
                                resolverName: delegationPayload.resolverName,
                                occupation: delegationPayload.occupation,
                                delegatedAt: delegationPayload.delegatedAt
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markDelegationAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markDelegationAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }

                    break;

                case "complaint_escalation_due": 
                    console.log("Entered into complaint_escalation_due");

                    const escalationPayload = event.payload as unknown as EscalateComplaintPayload;
                    const timestamp1 = event.processAfter.getTime();
                    const timestamp2 = new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).getTime();

                    console.log("Current time: ", event.processAfter);
                    console.log("Expiry time: ", new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)));

                    if (timestamp1 < timestamp2) { // check if the complaint has expired
                        console.log("pushing into queue due to escalation was due");
                        const pushEscalationEvent = await redisClient.lPush("queue", JSON.stringify({
                            id: event.id,
                            complaintId: escalationPayload.complaintId,
                            title: escalationPayload.title,
                            inchargeId: escalationPayload.inchargeId,
                            locationId: escalationPayload.locationId,
                            rank: escalationPayload.rank
                        }));
    
                        if (!pushEscalationEvent) {
                            throw new Error("Could not push the escalation event. Retrying...");
                        }

                        const markEscalationDueAsProcessed = await prisma.complaintOutbox.update({
                            where: { id: event.id },
                            data: { status: "PROCESSED" }
                        });

                        if (!markEscalationDueAsProcessed) {
                            throw new Error("Could not mark escalation due as processed. Retrying...");
                        }
                    } 

                    break;
                
                case "complaint_escalated":
                    console.log("Entered into complaint_escalated");

                    const escalatedComplaintPayload = event.payload as unknown as EscalatedComplaintPayload;

                    const isEscalatedEventPublished = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isEscalatedEventPublished) {
                        // publish this event on 'escalation' channel
                        await redisClient.publish("escalation", JSON.stringify({
                            idemPotencyKey, // apply idempotencyKey 
                            type: ESCALATED,
                            data: {
                                complaintId: escalatedComplaintPayload.complaintId,
                                complainerId: escalatedComplaintPayload.complainerId,
                                access: escalatedComplaintPayload.access,
                                title: escalatedComplaintPayload.title,
                                wasAssignedTo: escalatedComplaintPayload.wasAssignedTo,
                                isAssignedTo: escalatedComplaintPayload.isAssignedTo,
                                inchargeName: escalatedComplaintPayload.inchargeName,
                                designation: escalatedComplaintPayload.designation,
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markEscalationAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markEscalationAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }
                    
                    break;
                
                case "complaint_resolved":
                    console.log("Entered into complaint_resolved case");

                    const resolutionPayload = event.payload as unknown as ResolveComplaintPayload;

                    const isResolutionEventProcessed = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isResolutionEventProcessed) {
                        await redisClient.publish("resolution", JSON.stringify({
                            idemPotencyKey,
                            type: RESOLVED,
                            data: {
                                complaintId: resolutionPayload.complaintId,
                                complainerId: resolutionPayload.complainerId,
                                access: resolutionPayload.access,
                                title: resolutionPayload.title,
                                wasAssignedTo: resolutionPayload.inchargeId,
                                inchargeName: resolutionPayload.inchargeName,
                                resolverDetails: resolutionPayload.resolverDetails,
                                resolverdAt: resolutionPayload.resolvedAt
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markResolutionAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markResolutionAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }

                    break;

                case "complaint_updated": 
                    const updationPayload = event.payload as unknown as UpdateComplaintPayload;

                    const isUpdationEventProcessed = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isUpdationEventProcessed) {
                        // publish this event to 'updation' channel
                        await redisClient.publish("updation", JSON.stringify({
                            idemPotencyKey,
                            type: UPDATED,
                            data: {
                                complaintId: updationPayload.complaintId,
                                complainerId: updationPayload.complainerId,
                                title: updationPayload.title,
                                description: updationPayload.description,
                                access: updationPayload.access,
                                postAsAnonymous: updationPayload.postAsAnonymous,
                                status: UPDATED,
                                isAssignedTo: updationPayload.isAssignedTo,
                                attachments: updationPayload.attachments,
                                tags: updationPayload.tags,
                                updatedAt: updationPayload.updatedAt,
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markUpdationAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markUpdationAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }

                    break;

                case "complaint_upvoted": 
                    const upvotePayload = event.payload as unknown as UpvoteComplaintPayload;

                    const isUpvoteEventProcessed = await prisma.processedEvent.findUnique({
                        where: { eventId: idemPotencyKey }
                    });

                    if (!isUpvoteEventProcessed) {
                        // publish this event to 'updation' channel
                        await redisClient.publish("updation", JSON.stringify({
                            idemPotencyKey,
                            type: UPVOTED,
                            data: {
                                complaintId: upvotePayload.complaintId,
                                complainerId: upvotePayload.complainerId,
                                access: upvotePayload.access,
                                title: upvotePayload.title,
                                upvotes: upvotePayload.upvotes,
                                hasUpvoted: upvotePayload.hasUpvoted,
                                isAssignedTo: upvotePayload.isAssignedTo
                            }
                        }));

                        const storeProcessedEvent = await prisma.processedEvent.create({
                            data: {
                                eventId: idemPotencyKey,
                                processedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000))
                            }
                        });

                        if (!storeProcessedEvent) {
                            throw new Error("Could not store the processed event. Retrying...");
                        }
                    }

                    const markUpvoteComplaintAsProcessed = await prisma.complaintOutbox.update({
                        where: {
                            id: event.id,
                        },
                        data: {
                            status: "PROCESSED"
                        }
                    });

                    if (!markUpvoteComplaintAsProcessed) {
                        throw new Error("Could not mark escalation as processed. Retrying...");
                    }

                    break;

                default:
                    break;
            }

            return;
        } catch (err) {
            console.error(err);
            attempt++;

            if (attempt === MAX_RETRIES) {
                await prisma.complaintOutbox.update({
                    where: { id: event.id },
                    data: { status: "PENDING" }
                });
                throw new Error("Max trial exceeded");
            }

            const delayTime = BASE_DELAY * Math.pow(2, attempt);
            await delay(delayTime);
        }
    }
}

async function startProcessor(redisClient: RedisClient) {
    try {
        const isConnected = RedisClient.isRedisConnected();

        if (!isConnected) {
            throw new Error("Redis is not connected");
        }

        while (true) {

            const complaintEvents = await prisma.complaintOutbox.findMany({
                where: { status: "PENDING" },
                take: 10,
                // orderBy: { createdAt: 'asc' } // TODO: Add createdAt field inside outbox table
            });

            if (!complaintEvents) {
                throw new Error("Could not find the complaintEvents.");
            }

            for (const event of complaintEvents) {
                try {
                    await processWithExponentialBackOff(event, redisClient);
                } catch (err) {
                    console.error(err);
                }
            };

            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(1)
                }, 5000);
            });

        }

    } catch (err) {
        console.error(err);
    }
}