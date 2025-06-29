import { prisma } from "@repo/db/client";
import { RedisClient } from "@repo/redis/client";
import { notifyViaSms } from "./notify";

async function startWorker() {
    try {
        const consumer = await RedisClient.getInstance();
        const isConnected = RedisClient.isRedisConnected();

        if (!isConnected) {
            throw new Error("Redis is not connected");
        }

        while (true) {
            try {
                let result = await consumer.lIndex("worker-queue", 0);

                if (!result) {
                    const event = await consumer.blMove("queue", "worker-queue", "RIGHT", "LEFT", 0);
                    result = event;
                }

                const jsonData = JSON.parse(result as string);

                if (jsonData.eventType === "escalation") {
                    // find the next incharge location-wise
                    const nextIncharge = await prisma.issueIncharge.findFirst({
                        where: {
                            locationId: jsonData.locationId,
                            designation: {
                                rank: jsonData.rank - 1
                            }
                        },
                        select: {
                            incharge: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            },
                            designation: {
                                select: {
                                    designation: {
                                        select: {
                                            designationName: true,
                                        }
                                    },
                                    rank: true,
                                }
                            },
                            location: true,
                        }
                    });

                    if (!nextIncharge) {
                        await consumer.lRem("worker-queue", -1, result as string);
                        throw new Error("No issue incharge found");
                    }

                    const escalateComplaint = await prisma.$transaction(async (tx) => {
                        // update the complaint with next incharge
                        const escalatedComplaint = await tx.complaint.update({
                            where: {
                                id: jsonData.complaintId
                            },
                            data: {
                                complaintAssignment: {
                                    update: {
                                        assignedTo: nextIncharge.incharge.id,
                                        assignedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                    }
                                },
                                complaintHistory: {
                                    create: {
                                        eventType: "ESCALATED",
                                        handledBy: nextIncharge.incharge.id,
                                        happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                    }
                                },
                                expiredAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString() // 2 mins after current time
                            },
                            include: {
                                attachments: {
                                    select: {
                                        id: true,
                                        imageUrl: true
                                    }
                                },
                                tags: {
                                    select: {
                                        tags: {
                                            select: {
                                                tagName: true
                                            }
                                        }
                                    }
                                },
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                },
                                complaintAssignment: {
                                    select: {
                                        assignedAt: true,
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                phoneNumber: true,
                                                issueIncharge: {
                                                    select: {
                                                        designation: {
                                                            select: {
                                                                designation: {
                                                                    select: {
                                                                        designationName: true,
                                                                    }
                                                                },
                                                                rank: true,
                                                            }
                                                        },
                                                        location: {
                                                            select: {
                                                                locationName: true,
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                            }
                        });

                        if (!escalatedComplaint) {
                            // retry
                            throw new Error("escalation failed");
                        }

                        const notifyUserAboutEscalation = await tx.notification.create({
                            data: {
                                userId: escalatedComplaint.userId,
                                eventType: "ESCALATED",
                                payload: {
                                    complaintId: escalatedComplaint.id,
                                    title: escalatedComplaint.title,
                                    isEscalatedTo: escalatedComplaint.complaintAssignment?.user?.name,
                                    designation: escalatedComplaint.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                                },
                                createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }
                        });

                        if (!notifyUserAboutEscalation) {
                            throw new Error("Could not notify user about escalation");
                        }

                        const storeComplaintToPublishEscalation = await tx.complaintOutbox.createMany({
                            data: [{
                                eventType: "complaint_escalated",
                                payload: {
                                    complaintId: escalatedComplaint.id,
                                    complainerId: escalatedComplaint.userId,
                                    access: escalatedComplaint.access,
                                    title: escalatedComplaint.title,
                                    wasAssignedTo: jsonData.inchargeId,
                                    isAssignedTo: escalatedComplaint.complaintAssignment?.user?.id,
                                    inchargeName: escalatedComplaint.complaintAssignment?.user?.name,
                                    designation: escalatedComplaint.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                                },
                                status: "PENDING",
                                processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }, {
                                eventType: "complaint_escalation_due",
                                payload: {
                                    complaintId: escalatedComplaint.id,
                                    title: escalatedComplaint.title,
                                    inchargeId: escalatedComplaint.complaintAssignment?.user?.id,
                                    locationId: jsonData.locationId,
                                    rank: nextIncharge.designation.rank,
                                },
                                status: "PENDING",
                                processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString()
                            }]
                        });

                        if (!storeComplaintToPublishEscalation) {
                            throw new Error("Store escalated complaint details in outbox failed.");
                        }

                        return escalatedComplaint;
                    });

                    if (!escalateComplaint) {
                        throw new Error("Escalation failed.");
                    }

                    console.log("Escalation successful");

                } else if (jsonData.eventType === "closure") {
                    // close the complaint
                    const closeComplaint = await prisma.$transaction(async (tx) => {
                        const markComplaintAsClosed = await tx.complaint.update({
                            where: { id: jsonData.complaintId },
                            data: {
                                status: "CLOSED",
                                complaintHistory: {
                                    create: {
                                        eventType: "CLOSED",
                                        happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                    }
                                },
                                feedback: {
                                    update: {
                                        mood: "",
                                        remarks: "No feedback",
                                        givenAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                    }
                                },
                                closedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }
                        });

                        if (!markComplaintAsClosed) {
                            throw new Error("Could not mark the complaint status as closed.");
                        }

                        const markClosureDueAsProcessed = await tx.complaintOutbox.updateMany({
                            where: {
                                AND: [
                                    { eventType: "complaint_closure_due" },
                                    {
                                        payload: {
                                            path: ['complaintId'],
                                            equals: jsonData.complaintId
                                        }
                                    }
                                ]
                            },
                            data: {
                                status: "PROCESSED"
                            }
                        });

                        if (!markClosureDueAsProcessed) {
                            throw new Error("Could not mark complaint closure due as processed");
                        }

                        const notifyUserAboutClosure = await tx.notification.create({
                            data: {
                                userId: jsonData.complainerId,
                                eventType: "CLOSED",
                                payload: {
                                    complaintId: jsonData.complaintId,
                                    title: jsonData.title,
                                },
                                createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }
                        });

                        if (!notifyUserAboutClosure) {
                            throw new Error("Could not notify user about complaint closure");
                        }

                        const outboxDetails = await tx.complaintOutbox.create({
                            data: {
                                eventType: "complaint_closed",
                                payload: {
                                    complaintId: jsonData.complaintId,
                                    complainerId: jsonData.complainerId,
                                    isAssignedTo: jsonData.isAssignedTo,
                                    access: jsonData.access,
                                    title: jsonData.title,
                                    closedAt: jsonData.closedAt,
                                    feedback: {
                                        id: jsonData.feedback.id,
                                        mood: jsonData.feedback.mood,
                                        remarks: jsonData.feedback.remarks,
                                        givenAt: jsonData.feedback.givenAt
                                    }
                                },
                                status: "PENDING",
                                processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }
                        });

                        if (!outboxDetails) {
                            throw new Error("Could not create outbox details.");
                        }

                        return markComplaintAsClosed;
                    });

                    if (!closeComplaint) {
                        throw new Error("auto complaint closure failed.");
                    }

                    console.log("Complaint closed successfully");
                } else if (jsonData.eventType === "resolver_notification") {
                    // notify the resolver via sms about the complaint with the necessary details
                    const resolverContact = `+91${jsonData.resolverPhoneNumber}`;
                    const response = await notifyViaSms([resolverContact],
                        `Hello ${jsonData.resolverName}, You have a new complaint assigned to you, Title: ${jsonData.title}, Location: ${jsonData.location}, Incharge Details: ${jsonData.inchargeName} (${jsonData.inchargeDesignation}), ${jsonData.inchargePhoneNumber}`
                    );

                    console.log(response);

                    if (!response) {
                        throw new Error("Could not send SMS to resolver. Trying again...");
                    }

                    // store delegation event in outbox for further propagation
                    const storeDelegationEvent = await prisma.complaintOutbox.create({
                        data: {
                            eventType: "complaint_delegated",
                            payload: {
                                complaintId: jsonData.complaintId,
                                complainerId: jsonData.complainerId,
                                access: jsonData.access,
                                title: jsonData.title,
                                isAssignedTo: jsonData.isAssignedTo,
                                delegatedTo: jsonData.resolverId,
                                resolverName: jsonData.resolverName,
                                occupation: jsonData.occupation,
                                delegatedAt: jsonData.delegatedAt,
                            },
                            status: "PENDING",
                            processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    });

                    if (!storeDelegationEvent) {
                        throw new Error("Could not store delegation event in outbox");
                    }

                    console.log("Delegation event stored in outbox successfully");

                } else {
                    throw new Error("Invalid eventType");
                }

                await consumer.lRem("worker-queue", -1, result as string);
                await new Promise((resolve) => setTimeout(resolve, 5000));

            } catch (err) {
                console.error(err);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }


    } catch (err) {
        console.error(err);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

startWorker().catch(console.error);