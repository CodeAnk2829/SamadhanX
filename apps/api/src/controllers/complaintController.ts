import { prisma } from "@repo/db/client";
import { CreateComplaintSchema } from "@repo/types/complaintTypes";
import { RedisManager } from "../util/RedisManager";

export const createComplaintOutbox = async (req: any, res: any) => {
    try {
        const complaints = await prisma.complaint.findMany({
            select: { id: true }
        });

        if (!complaints) {
            throw new Error("could not find complaints");
        }

        const complaintData = complaints.map((c: any) => {
            return {
                complaintId: c.id
            }
        });

        console.log(complaintData);

        const count = await prisma.complaintOutbox.createMany({
            data: complaintData
        })

        if(!count) {
            throw new Error("could not fill outbox");
        }

        res.status(201).json({
            ok: true,
            count
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred."
        });
    }
}

export const createComplaint = async (req: any, res: any) => {
    try {
        const redisClient = RedisManager.getInstance();
        const body = req.body; // { title: string, description: string, access: string, postAsAnonymous: boolean, locationId: Int, tags: Array<Int>, attachments: Array<String> }
        const parseData = CreateComplaintSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        let tagData: any[] = [];
        let attachmentsData: any[] = [];

        parseData.data.tags.forEach(id => {
            tagData.push({ tagId: Number(id) });
        });

        parseData.data.attachments.forEach(url => {
            attachmentsData.push({ imageUrl: url });
        });

        // find the least ranked incharge of the hostel of the given location
        const issueIncharge = await prisma.issueIncharge.findFirst({
            where: {
                locationId: parseData.data.locationId
            },
            orderBy: {
                designation: {
                    rank: "desc"
                }
            },
            select: {
                inchargeId: true
            }
        });

        if (!issueIncharge) {
            throw new Error("No incharge found for the given location");
        }

        const currentDateTime = Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000);

        const createComplaint = await prisma.complaint.create({
            data: {
                title: parseData.data.title,
                description: parseData.data.description,
                access: parseData.data.access,
                postAsAnonymous: parseData.data.postAsAnonymous,
                complaintOutbox: {
                    create: {}
                },
                complaintAssignment: {
                    create: {
                        assignedTo: issueIncharge.inchargeId,
                        assignedAt: new Date(currentDateTime).toISOString()
                    }
                },
                complaintDelegation: {
                    create: {}
                },
                complaintResolution: {
                    create: {}
                },
                user: {
                    connect: {
                        id: req.user.id
                    }
                },
                status: "ASSIGNED",
                tags: {
                    create: tagData
                },
                attachments: {
                    create: attachmentsData
                },
                createdAt: new Date(currentDateTime).toISOString(),
                expiredAt: new Date(currentDateTime + 2 * 60 * 1000).toISOString() // 7 days from now
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

        if (!createComplaint) {
            throw new Error("Could not create complaint. Please try again");
        }

        const tagNames = createComplaint.tags.map(tag => tag.tags.tagName);
        const attachments = createComplaint.attachments.map(attachment => attachment.imageUrl);

        let complaintResponse = createComplaint;

        if (createComplaint.postAsAnonymous) {
            complaintResponse = {
                ...createComplaint,
                user: {
                    id: createComplaint.user.id,
                    name: "Anonymous",
                }
            }
        }

        // publish this event on 'creation' channel
        await redisClient.publishMessage("creation", {
            type: "CREATED",
            data: {
                complaintId: complaintResponse.id
            }
        });

        res.status(201).json({
            ok: true,
            message: "Complaint created successfully",
            complaintId: complaintResponse.id,
            title: complaintResponse.title,
            description: complaintResponse.description,
            access: complaintResponse.access,
            postAsAnonymous: complaintResponse.postAsAnonymous,
            userName: complaintResponse.user.name,
            userId: complaintResponse.user.id,
            status: complaintResponse.status,
            inchargeId: issueIncharge.inchargeId,
            inchargeName: complaintResponse.complaintAssignment?.user?.name,
            inchargeDesignation: complaintResponse.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
            inchargeRank: complaintResponse.complaintAssignment?.user?.issueIncharge?.designation.rank,
            location: complaintResponse.complaintAssignment?.user?.issueIncharge?.location.locationName,
            assignedAt: complaintResponse.complaintAssignment?.assignedAt,
            upvotes: complaintResponse.totalUpvotes,
            actionTaken: complaintResponse?.actionTaken,
            attachments: attachments,
            tags: tagNames,
            createdAt: complaintResponse.createdAt,
            expiredAt: complaintResponse.expiredAt
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while creating the complaint"
        });
    }
}

export const deletedComplaintById = async (req: any, res: any) => {
    try {
        const complaintId = req.params.id;
        const currentUserId = req.user.id;

        // check if current user is the one who created this complaint
        const doesComplaintBelongToLoggedInUser = await prisma.complaint.findUnique({
            where: { id: complaintId },
            select: { userId: true }
        });

        if (!doesComplaintBelongToLoggedInUser) {
            throw new Error("No complaint exist with this given id");
        }

        if (doesComplaintBelongToLoggedInUser.userId !== currentUserId) {
            throw new Error("Access Denied. You do not have permissions to make changes.")
        }

        const deletedComplaint = await prisma.complaint.delete({
            where: { id: complaintId },
            select: { id: true }
        });

        if (!deletedComplaint) {
            throw new Error("Could not delete complaint. Please try again.");
        }

        res.status(200).json({
            ok: true,
            message: "Complaint deleted successfully.",
            complaintId
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while deleting the complaint."
        });
    }
}

export const getAllComplaints = async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            throw new Error("Unauthorized");
        }

        const complaints = await prisma.complaint.findMany({
            where: {
                access: "PUBLIC"
            },
            orderBy: {
                createdAt: "desc" // get recent complaints first
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
                                email: true,
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
                                        location: true,
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });

        if (!complaints) {
            throw new Error("An error occurred while fetching complaints");
        }

        let complaintResponse: any = [];
        complaints.forEach((complaint: any) => {
            if (complaint.postAsAnonymous) {
                complaintResponse.push({
                    ...complaint,
                    user: {
                        id: complaint.user.id,
                        name: "Anonymous",
                    }
                });
            } else {
                complaintResponse.push(complaint);
            }
        });

        // all upvoted complaints by the currently logged in user
        const upvotedComplaints = await prisma.upvote.findMany({
            where: {
                userId
            },
            select: {
                complaintId: true
            }
        });

        const complaintDetails = complaintResponse.map((complaint: any) => {
            return {
                id: complaint.id,
                title: complaint.title,
                description: complaint.description,
                access: complaint.access,
                postAsAnonymous: complaint.postAsAnonymous,
                status: complaint.status,
                actionTaken: complaint.actionTaken,
                upvotes: complaint.totalUpvotes,
                complainerId: complaint.userId,
                complainerName: complaint.user.name,
                attachments: complaint.attachments,
                tags: complaint.tags.map((tag: any) => tag.tags.tagName),
                assignedTo: complaint.complaintAssignment.user.name,
                inchargeId: complaint.complaintAssignment.user.id,
                inchargeName: complaint.complaintAssignment.user.name,
                inchargeEmail: complaint.complaintAssignment.user.email,
                inchargePhone: complaint.complaintAssignment.user.phoneNumber,
                designation: complaint.complaintAssignment.user.issueIncharge.designation.designation.designationName,
                inchargeRank: complaint.complaintAssignment.user.issueIncharge.designation.rank,
                location: complaint.complaintAssignment.user.issueIncharge.location.locationName,
                assignedAt: complaint.complaintAssignment.assignedAt,
                createdAt: complaint.createdAt,
                expiredAt: complaint.expiredAt,
            }
        });

        res.status(200).json({
            ok: true,
            complaintDetails,
            upvotedComplaints: upvotedComplaints.map((u: any) => u.complaintId),
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaints"
        });
    }
}

export const getComplaintById = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const complaintId = req.params.id;

        const userRole = req.user.role;

        if(userRole === "ISSUE_INCHARGE") {
            // check whether the complaint is assigned to the current incharge
            const assignedComplaint = await prisma.complaint.findFirst({
                where: {
                    id: complaintId,
                    complaintAssignment: {
                        assignedTo: userId
                    }
                },
                select: {
                    id: true
                }
            });

            if(!assignedComplaint) {
                throw new Error("Unauthorized. You are not assigned to this complaint");
            }
        }

        const complaint = await prisma.complaint.findUnique({
            where: {
                id: complaintId
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
                                        location: true,
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });

        if (!complaint) {
            throw new Error("Could not fetch the required complaint");
        }

        const upvote = await prisma.upvote.findFirst({
            where: { userId, complaintId },
            select: { id: true }
        });

        let hasUpvoted: boolean = false;

        if (upvote) {
            hasUpvoted = true;
        }

        let complaintResponse = complaint;

        if (complaint.postAsAnonymous) {
            complaintResponse = {
                ...complaint,
                user: {
                    name: "Anonymous",
                }
            }
        }

        res.status(201).json({
            ok: true,
            id: complaintResponse.id,
            title: complaintResponse.title,
            description: complaintResponse.description,
            access: complaintResponse.access,
            postAsAnonymous: complaintResponse.postAsAnonymous,
            status: complaintResponse.status,
            actionTaken: complaintResponse.actionTaken,
            upvotes: complaintResponse.totalUpvotes,
            complainerId: complaintResponse.userId,
            complainerName: complaintResponse.user.name,
            attachments: complaintResponse.attachments,
            tags: complaintResponse.tags.map((tag: any) => tag.tags.tagName),
            assignedTo: complaintResponse.complaintAssignment?.user?.name,
            inchargeId: complaintResponse.complaintAssignment?.user?.id,
            inchargePhone: complaintResponse.complaintAssignment?.user?.phoneNumber,
            designation: complaintResponse.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
            inchargeRank: complaintResponse.complaintAssignment?.user?.issueIncharge?.designation.rank,
            location: complaintResponse.complaintAssignment?.user?.issueIncharge?.location.locationName,
            hasUpvoted,
            assignedAt: complaintResponse.complaintAssignment?.assignedAt,
            createdAt: complaintResponse.createdAt,
            expiredAt: complaintResponse.expiredAt,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaint"
        });
    }
}

export const getUsersComplaints = async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const complaints = await prisma.complaint.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: "desc" // get recent complaints first
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
                                        location: true,
                                    }
                                }
                            }
                        }
                    }
                },
            }
        });

        if (!complaints) {
            throw new Error("No complaints found for the given user");
        }

        // get all upvoted complaints by this user
        const upvotedComplaints = await prisma.upvote.findMany({
            where: {
                userId
            },
            select: {
                complaintId: true
            }
        });

        const complaintDetails = complaints.map((complaint: any) => {
            return {
                id: complaint.id,
                title: complaint.title,
                description: complaint.description,
                access: complaint.access,
                postAsAnonymous: complaint.postAsAnonymous,
                status: complaint.status,
                actionTaken: complaint.actionTaken,
                upvotes: complaint.totalUpvotes,
                complainerId: complaint.userId,
                complainerName: complaint.user.name,
                attachments: complaint.attachments,
                tags: complaint.tags.map((tag: any) => tag.tags.tagName),
                assignedTo: complaint.complaintAssignment.user.name,
                inchargeId: complaint.complaintAssignment.user.id,
                inchargePhone: complaint.complaintAssignment.user.phoneNumber,
                designation: complaint.complaintAssignment.user.issueIncharge.designation.designation.designationName,
                inchargeRank: complaint.complaintAssignment.user.issueIncharge.designation.rank,
                location: complaint.complaintAssignment.user.issueIncharge.location.locationName,
                assignedAt: complaint.complaintAssignment.assignedAt,
                createdAt: complaint.createdAt,
                expiredAt: complaint.expiredAt,
            }
        });

        res.status(200).json({
            ok: true,
            complaintDetails,
            upvotedComplaints: upvotedComplaints.map((u: any) => u.complaintId),
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaints"
        });
    }
}

export const upvoteComplaint = async (req: any, res: any) => {
    try {
        const complaintId: string = req.params.id;
        const userId: string = req.user.id;

        if (!userId) {
            throw new Error("Unauthorized");
        }

        if (!complaintId) {
            throw new Error("No complaint id provided");
        }
        // first check an user has already upvoted
        const hasUpvoted = await prisma.upvote.findFirst({
            where: { userId, complaintId },
            select: { id: true }
        });

        let finalAction: any;

        if (!hasUpvoted) {
            const addUpvote = await prisma.upvote.create({
                data: {
                    userId,
                    complaintId
                },
            });

            if (!addUpvote) {
                throw new Error("Could not upvote. Please try again");
            }
            finalAction = { increment: 1 };
        } else {
            const removeUpvote = await prisma.upvote.delete({
                where: {
                    id: hasUpvoted.id
                }
            });

            if (!removeUpvote) {
                throw new Error("Could not remove upvote. Please try again");
            }
            finalAction = { decrement: 1 };
        }

        // count total upvotes for a complaint
        const upvotes = await prisma.complaint.update({
            where: { id: complaintId },
            data: {
                totalUpvotes: finalAction
            },
            select: {
                totalUpvotes: true
            }
        });

        if (!upvotes) {
            throw new Error("Could not count total upvotes for the complaint");
        }

        res.status(200).json({
            ok: true,
            upvotes: upvotes.totalUpvotes,
            hasUpvoted: hasUpvoted ? false : true
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while voting"
        });
    }
}