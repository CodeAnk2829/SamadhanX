import  { prisma }  from "@repo/db/client";
import { RedisClient } from "@repo/redis/client";

async function main() {
    const redisClient = await RedisClient.getInstance();
    
    async function startProcessor() {
        try {
            const isConnected = RedisClient.isRedisConnected();
    
            if(!isConnected) {
                throw new Error("Redis is not connected");
            }
    
            while(true) {
                console.log(new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString());
    
                // fetch all complaints from complaintOutbox table and push them into the queue

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
                                        assignedAt: true,
                                        user: {
                                            select: {
                                                id: true,
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
        
                if(complaints.length === 0) {
                    await new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(1)
                        }, 60000);
                    });
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
                        inchargeId: c.complaint.complaintAssignment?.user?.id,
                        designationId: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.id,
                        designation: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.designation?.designationName,
                        rank: c.complaint.complaintAssignment?.user?.issueIncharge?.designation?.rank,
                        expiredAt: c.complaint.expiredAt,
                    }
                });
                
                console.log("complaint to be pushed: ", complaintsToBePushed);
                
                // put them into the queue
                for(const complaint of complaintsToBePushed) {
                    try {
                        const ack = await redisClient.lPush("queue", JSON.stringify(complaint));
                        console.log("this is acknowledgement : ", ack);

                    } catch(err) {
                        console.error(err);
                        continue;
                    }
                }
                
                // wait for 1 minute until this processor polls the database next time
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
}

main().catch(console.error);