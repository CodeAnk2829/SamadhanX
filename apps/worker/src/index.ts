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
                // remove the complaint from complaintOutbox table
                const deletedComplaint = await prisma.complaintOutbox.deleteMany({
                    where: {
                        complaintId: jsonData.complaintId
                    }
                });

                if (deletedComplaint) {
                    // remove the complaint from the queue as we reached to highest rank
                    await consumer.lRem("worker-queue", -1, result as string);
                } else {
                    console.log("deletion of a complaint from complaintOutbox table by worker unsuccessful");
                }

                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            // update the complaint with next incharge
            const escalateComplaint = await prisma.complaint.update({
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

            if (!escalateComplaint) {
                // retry
                console.log("Escalation failed");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            console.log("Escalation successful");
            console.log(escalateComplaint);

            // publish this event on 'creation' channel
            await consumer.publish("escalation", JSON.stringify({
                type: "ESCALATED",
                data: {
                    complaintId: escalateComplaint.id,
                    title: escalateComplaint.title,
                    wasAssignedTo: jsonData.inchargeId,
                    isAssignedTo: escalateComplaint.complaintAssignment?.user?.id as string,
                    inchargeName: escalateComplaint.complaintAssignment?.user?.name as string,
                    designation: escalateComplaint.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName as string,
                }
            }));

            await consumer.lRem("worker-queue", -1, result as string);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

    } catch (err) {
        console.error(err);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

startWorker().catch(console.error);