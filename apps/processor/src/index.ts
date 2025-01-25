import  { prisma }  from "@repo/db/client";
import { createClient } from "redis";

async function startProcessor() {
    const redisClient = createClient();
    try {
        await redisClient.connect();
        console.log("connected to redis");
        
        
        while(true) {
            console.log(new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString());

            // fetch first 10 complaints from complaintOutbox table and delete them
            const complaints = await prisma.complaintOutbox.findMany({ 
                where: {
                    complaint: {
                        expiredAt: {
                            lt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    }
                },
                select: {
                    id: true,
                    complaint: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            expiredAt: true,
                            complaintAssignment: {
                                select: {
                                    user: {
                                        select: {
                                            issueIncharge: {
                                                select: {
                                                    location: true,
                                                    designation: {
                                                        select: {
                                                            id: true,
                                                            designation: {
                                                                select: {
                                                                    designationName: true,
                                                                }
                                                            },
                                                            rank: true,
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
    
            if(!complaints) {
                continue;
            }
            
            const complaintsToBePushed = complaints.map((c: any) => {
                return {
                    id: c.id,
                    complaintId: c.complaint.id,
                    title: c.complaint.title,
                    description: c.complaint.description,
                    locationId: c.complaint.complaintAssignment?.user?.issueIncharge?.location?.id,
                    location: c.complaint.complaintAssignment?.user?.issueIncharge?.location?.locationName,
                    designationId: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.id,
                    designation: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.designation?.designationName,
                    rank: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.rank,
                    expiredAt: c.complaint.expiredAt,
                    newExpiryDate: new Date(new Date(c.complaint.expiredAt).getTime() + (2 * 60 * 1000)).toISOString()
                }
            });

            console.log(complaintsToBePushed);

            // put them into the queue
            for(const complaint of complaintsToBePushed) {
                await redisClient.lPush("queue", JSON.stringify(complaint));
            }

            // delete them from the complaintOutbox
            const deletion = await prisma.complaintOutbox.deleteMany({
                where: {
                    id: {
                        in: complaintsToBePushed.map((complaint: any) => complaint.id)
                    }
                }
            });

            if(!deletion) {
                continue;
            }

            console.log(deletion);
            
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(1)
                }, 60000);
            });
        }


    } catch(err) {
        console.error(err);
    }
}

startProcessor();