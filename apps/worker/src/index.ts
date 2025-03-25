import { prisma } from "@repo/db/client";
import { RedisClient } from "@repo/redis/client";

async function startWorker() {
    try {
        const consumer = await RedisClient.getInstance();
        const isConnected = RedisClient.isRedisConnected();

        if (!isConnected) {
            throw new Error("Redis is not connected");
        }

        while (true) {
            let result = await consumer.lIndex("worker-queue", 0);

            if (!result) {
                const event = await consumer.blMove("queue", "worker-queue", "RIGHT", "LEFT", 0);
                result = event;
            }

            // TODO: check whether the event is "closed" or "escalated" then perform actions
            
            const jsonData = JSON.parse(result as string);

            // find the next incharge
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
                console.log("No issue incharge found");
                await consumer.lRem("worker-queue", -1, result as string);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
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
                                assignedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                            }
                        },
                        expiredAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString() // 2 mins after current time
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
                    console.log("escalation failed");
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
                        processAfter: new Date(Date.now())
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
                        processAfter: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000))
                    }]
                });

                if (!storeComplaintToPublishEscalation) {
                    console.log("Store escalated complaint details in outbox failed.");
                }

                return escalatedComplaint;
            });

            if (!escalateComplaint) {
                console.log("Escalation failed.");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            console.log("Escalation successful");
            console.log(escalateComplaint);

            await consumer.lRem("worker-queue", -1, result as string);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

    } catch (err) {
        console.error(err);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

startWorker().catch(console.error);