import { prisma } from "@repo/db/client";
import { createClient } from "redis";

async function startWorker() {
    const consumer = createClient();

    try {
        await consumer.connect();
        console.log("Connected to Redis");

        while (true) {
            let result = await consumer.lIndex("worker-queue", 0);

            if (!result) {
                const event = await consumer.blMove("queue", "worker-queue", "RIGHT", "LEFT", 0);

                result = event;


                await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            const jsonData = JSON.parse(result as string);
            console.log(jsonData);

            if (jsonData.rank === 1) {
                continue;
            }

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
                console.log("No incharge found");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            console.log(nextIncharge);

            // update the complaint with next incharge
            const escalate = await prisma.complaint.update({
                where: {
                    id: jsonData.complaintId
                },
                data: {
                    complaintAssignment: {
                        update: {
                            assignedTo: nextIncharge.incharge.id
                        }
                    },
                    expiredAt: jsonData.newExpiryDate
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

            if (!escalate) {
                // retry
                console.log("Escalation failed");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
            }

            console.log(escalate);
            await consumer.lRem("worker-queue", -1, result as string);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

    } catch (err) {
        console.error(err);
    }
}

startWorker();