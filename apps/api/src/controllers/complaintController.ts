import { prisma } from "@repo/db/client";
import { CreateComplaintSchema, UpdateComplaintSchema } from "@repo/types/complaintTypes";
import { UPDATED, CLOSED, RECREATED, DELEGATED, ESCALATED, RESOLVED } from "@repo/types/wsMessageTypes";
import e, { request } from "express";

export const createComplaint = async (req: any, res: any) => {
    try {
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

        const createComplaint = await prisma.$transaction(async (tx: any) => {
            const complaintDetails = await tx.complaint.create({
                data: {
                    title: parseData.data.title,
                    description: parseData.data.description,
                    access: parseData.data.access,
                    postAsAnonymous: parseData.data.postAsAnonymous,
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                    expiredAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + 2 * 60 * 1000).toISOString(), // 7 days from now
                    complaintAssignment: {
                        create: {
                            assignedTo: issueIncharge.inchargeId,
                            assignedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                    complaintDelegation: {
                        create: {}
                    },
                    complaintHistory: {
                        createMany: {
                            data: [
                                {
                                    eventType: "CREATED",
                                    handledBy: req.user.id,
                                    happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                },
                                {
                                    eventType: "ASSIGNED",
                                    handledBy: issueIncharge.inchargeId,
                                    happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                }
                            ]
                        }
                    },
                    complaintResolution: {
                        create: {}
                    },
                    feedback: {
                        create: {
                            mood: "",
                            remarks: "",
                            givenAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
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
                                                    id: true,
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

            if (!complaintDetails) {
                throw new Error("Could not create complaint. Please try again");
            }

            const notifyUserAboutCreationAndAssignment = await tx.notification.createMany({
                data: [{
                    userId: req.user.id,
                    eventType: "CREATED",
                    payload: {
                        complaintId: complaintDetails.id,
                        title: complaintDetails.title,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }, {
                    userId: req.user.id,
                    eventType: "ASSIGNED",
                    payload: {
                        complaintId: complaintDetails.id,
                        title: complaintDetails.title,
                        isAssignedTo: complaintDetails.complaintAssignment.user.name,
                        designation: complaintDetails.complaintAssignment.user.issueIncharge.designation.designation.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (5 * 1000)).toISOString()
                }]
            });

            if (!notifyUserAboutCreationAndAssignment) {
                throw new Error("Could not notify user about complaint creation and assignment.");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "complaint_created",
                    payload: {
                        complaintId: complaintDetails.id,
                        complainerId: complaintDetails.userId,
                        access: complaintDetails.access,
                        title: complaintDetails.title,
                        isAssignedTo: complaintDetails.complaintAssignment?.user?.id,
                        escalation_due_at: complaintDetails.expiredAt,
                        locationId: complaintDetails.complaintAssignment?.user?.issueIncharge?.location.id,
                        rank: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.rank,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create outbox details.");
            }

            return complaintDetails;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });


        if (!createComplaint) {
            throw new Error("Could not create complaint. Please try again");
        }

        const tagNames = createComplaint.tags.map((tag: any) => tag.tags.tagName);
        const attachments = createComplaint.attachments.map((attachment: any) => attachment.imageUrl);

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

export const closeComplaint = async (req: any, res: any) => {
    try {
        const { complaintId, mood, remarks } = req.body;
        const userId = req.user.id;

        // check whether this complaint belong to the logged in user
        const complaintDetails = await prisma.complaint.findUnique({
            where: {
                id: complaintId
            },
            select: {
                title: true,
                userId: true,
                status: true,
            }
        });

        if (!complaintDetails) {
            throw new Error("Could not fetch complaint details.");
        }

        if (complaintDetails.userId !== userId) {
            throw new Error("Access denied");
        }

        if (complaintDetails.status !== "RESOLVED") {
            throw new Error("Complaint is not supposed to be closed at this state.");
        }

        const complaintClosed = await prisma.$transaction(async (tx) => {
            const closeComplaint = await tx.complaint.update({
                where: {
                    id: complaintId,
                },
                data: {
                    status: "CLOSED",
                    closedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                    complaintHistory: {
                        create: {
                            eventType: "CLOSED",
                            handledBy: userId,
                            happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                    feedback: {
                        update: {
                            mood,
                            remarks,
                            givenAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                },
                include: {
                    feedback: true,
                    complaintAssignment: {
                        include: {
                            user: {
                                omit: {
                                    password: true,
                                }
                            },
                        }
                    },
                }
            });

            if (!closeComplaint) {
                throw new Error("Could not close the complaint.");
            }

            const markClosureDueAsProcessed = await tx.complaintOutbox.updateMany({
                where: {
                    AND: [
                        { eventType: "complaint_closure_due" },
                        {
                            payload: {
                                path: ['complaintId'],
                                equals: complaintId
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
                    userId,
                    eventType: CLOSED,
                    payload: {
                        complaintId,
                        title: complaintDetails.title,
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
                        complaintId: closeComplaint.id,
                        complainerId: closeComplaint.userId,
                        isAssignedTo: closeComplaint.complaintAssignment?.user?.id,
                        access: closeComplaint.access,
                        title: closeComplaint.title,
                        closedAt: closeComplaint.closedAt,
                        feedback: {
                            id: closeComplaint.feedback?.id,
                            mood: closeComplaint.feedback?.mood,
                            remarks: closeComplaint.feedback?.remarks,
                            givenAt: closeComplaint.feedback?.givenAt
                        }
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create outbox details.");
            }

            return closeComplaint;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });

        if (!complaintClosed) {
            throw new Error("Could not close the complaint.");
        }

        res.status(200).json({
            ok: true,
            message: "Complaint closed successfully.",
            complaintClosed,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while closing the complaint."
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
            select: {
                userId: true,
                status: true,
            }
        });

        if (!doesComplaintBelongToLoggedInUser) {
            throw new Error("No complaint exist with this given id");
        }

        if (doesComplaintBelongToLoggedInUser.userId !== currentUserId) {
            throw new Error("Access Denied. You do not have permissions to make changes.")
        }

        if (doesComplaintBelongToLoggedInUser.status === DELEGATED ||
            doesComplaintBelongToLoggedInUser.status === RESOLVED
        ) {
            throw new Error("Delete action could not be performed as complaint status is undesirable");
        }

        const deletedComplaint = await prisma.$transaction(async (tx: any) => {
            const complaintDeletion = await tx.complaint.delete({
                where: { id: complaintId },
                select: {
                    id: true,
                    title: true,
                    access: true,
                    userId: true,
                    complaintAssignment: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!complaintDeletion) {
                throw new Error("Deletion request failed.");
            }

            const deleteComplaintFromNotification = await tx.notification.deleteMany({
                where: {
                    payload: {
                        path: ['complaintId'],
                        equals: complaintId
                    }
                }
            });

            if (!deleteComplaintFromNotification) {
                throw new Error("Could not delete all notifications of a complaint.");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "complaint_deleted",
                    payload: {
                        complaintId,
                        complainerId: complaintDeletion.userId,
                        access: complaintDeletion.access,
                        title: complaintDeletion.title,
                        wasAssignedTo: complaintDeletion.complaintAssignment?.user?.id as string
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            // also mark escalation_due event as processed as the complaint was deleted
            const markEscalationDueAsProcessed = await tx.complaintOutbox.updateMany({
                where: {
                    AND: [
                        { eventType: "complaint_escalation_due" },
                        {
                            payload: {
                                path: ['complaintId'],
                                equals: complaintId
                            }
                        }
                    ]
                },
                data: {
                    status: "PROCESSED"
                }
            });

            if (!markEscalationDueAsProcessed) {
                throw new Error("Could not mark complaint escalation due as processed");
            }

            if (!outboxDetails) {
                throw new Error("Could not create complaint_deleted event in outbox.");
            }

            return complaintDeletion;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
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

export const recreateComplaint = async (req: any, res: any) => {
    try {
        const complaintId = req.params.id;
        const currentUserId = req.user.id;

        // check if the current user is the one who had raised this complaint earlier
        const relatedUserAndStatusDetails = await prisma.complaint.findUnique({
            where: { id: complaintId },
            select: {
                title: true,
                userId: true,
                status: true,
                complaintAssignment: {
                    select: {
                        user: {
                            select: {
                                issueIncharge: {
                                    select: {
                                        locationId: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!relatedUserAndStatusDetails) {
            throw new Error("No complaint found with the given id");
        }

        if (relatedUserAndStatusDetails.userId !== currentUserId) {
            throw new Error("Access Denied. You do not have permissions to recreate this complaint.");
        }

        if (relatedUserAndStatusDetails.status !== "RESOLVED") {
            throw new Error("Complaint cannot be recreated at this stage.");
        }

        // find the least ranked incharge of the hostel of the given location
        const issueIncharge = await prisma.issueIncharge.findFirst({
            where: {
                locationId: relatedUserAndStatusDetails.complaintAssignment?.user?.issueIncharge?.locationId
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

        const complaintRecreation = await prisma.$transaction(async (tx) => {
            const complaintDetails = await tx.complaint.update({
                where: {
                    id: complaintId,
                },
                data: {
                    status: "RECREATED",
                    actionTaken: false,
                    updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                    expiredAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + 2 * 60 * 1000).toISOString(), // 7 days from now
                    complaintAssignment: {
                        update: {
                            assignedTo: issueIncharge.inchargeId,
                            assignedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                    complaintHistory: {
                        createMany: {
                            data: [
                                {
                                    eventType: "RECREATED",
                                    handledBy: req.user.id,
                                    happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                },
                                {
                                    eventType: "ASSIGNED",
                                    handledBy: issueIncharge.inchargeId,
                                    happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                                }
                            ]
                        }
                    },
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
                                                    id: true,
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

            if (!complaintDetails) {
                throw new Error("Complaint could not be recreated.");
            }

            const notifyUserAboutRecreation = await tx.notification.createMany({
                data: [{
                    userId: currentUserId,
                    eventType: RECREATED,
                    payload: {
                        complaintId,
                        title: relatedUserAndStatusDetails.title,
                        isAssignedTo: complaintDetails.complaintAssignment?.user?.name,
                        designation: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }, {
                    userId: currentUserId,
                    eventType: "ASSIGNED",
                    payload: {
                        complaintId: complaintDetails.id,
                        title: complaintDetails.title,
                        isAssignedTo: complaintDetails.complaintAssignment?.user?.name,
                        designation: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (5 * 1000)).toISOString()
                }]
            });

            if (!notifyUserAboutRecreation) {
                throw new Error("Could not notify user about complaint recreation.");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "complaint_recreated",
                    payload: {
                        complaintId: complaintDetails.id,
                        complainerId: complaintDetails.userId,
                        access: complaintDetails.access,
                        title: complaintDetails.title,
                        isAssignedTo: complaintDetails.complaintAssignment?.user?.id,
                        escalation_due_at: complaintDetails.expiredAt,
                        locationId: complaintDetails.complaintAssignment?.user?.issueIncharge?.location.id,
                        rank: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.rank,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create outbox details.");
            }

            const markClosureDueAsProcessed = await tx.complaintOutbox.updateMany({
                where: {
                    AND: [
                        { eventType: "complaint_closure_due" },
                        {
                            payload: {
                                path: ['complaintId'],
                                equals: complaintId
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

            return complaintDetails;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });

        if (!complaintRecreation) {
            throw new Error("Could not recreate the complaint.");
        }

        const tagNames = complaintRecreation.tags.map((tag: any) => tag.tags.tagName);
        const attachments = complaintRecreation.attachments.map((attachment: any) => attachment.imageUrl);

        let complaintResponse = complaintRecreation;

        if (complaintRecreation.postAsAnonymous) {
            complaintResponse = {
                ...complaintRecreation,
                user: {
                    id: complaintRecreation.user.id,
                    name: "Anonymous",
                }
            }
        }

        res.status(201).json({
            ok: true,
            message: "Complaint recreated successfully",
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
            recreatedAt: complaintResponse.updatedAt,
            expiredAt: complaintResponse.expiredAt
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while recreating the complaint."
        });
    }
}

export const getAllComplaints = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { requestComingFrom } = req.query;

        if (!userId) {
            throw new Error("Unauthorized");
        }

        if (requestComingFrom !== "home" && requestComingFrom !== "dashboard") {
            throw new Error("Invalid request");
        }

        const complaints = await prisma.complaint.findMany({
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

        if (userRole === "STUDENT" || userRole === "FACULTY") {
            complaintResponse = requestComingFrom === "home"
                ? complaintResponse.filter((complaint: any) => complaint.access === "PUBLIC")
                : complaintResponse.filter((complaint: any) => complaint.access === "PUBLIC"
                    || (complaint.access === "PRIVATE" && complaint.userId === req.user.id));
        } else if (userRole === "ISSUE_INCHARGE") {
            complaintResponse = complaintResponse.filter((complaint: any) => complaint.complaintAssignment.user.id === req.user.id);
        }

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

        if (userRole === "ISSUE_INCHARGE") {
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

            if (!assignedComplaint) {
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
                        email: true,
                        phoneNumber: true,
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
            },
        });

        if (!complaint) {
            throw new Error("Could not fetch the required complaint");
        }

        if ((userRole === "STUDENT" || userRole === "FACULTY") && complaint.access === "PRIVATE" && userId !== complaint.userId) {
            throw new Error("No 'Public' complaint found with the given complaint ID");
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
                    email: complaint.user.email,
                    phoneNumber: complaint.user.phoneNumber
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
            complainerEmail: complaintResponse.user.email,
            complainerPhone: complaintResponse.user.phoneNumber,
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

export const getFilteredComplaints = async (req: any, res: any) => {
    try {

        const { requestComingFrom } = req.query;
        const { filterByLocations, filterByTags, filterByStatus } = req.body; // { filterByLocations: int[], filterByTags: int[], filterByStatus: string[] }
        const userRole = req.user.role;

        if (requestComingFrom !== "home" && requestComingFrom !== "dashboard") {
            throw new Error("Invalid request");
        }

        // const complaints = await prisma.complaintCategory.findMany({
        //     where: {
        //         AND: [
        //             {
        //                 complaints: {
        //                     AND: [
        //                         {
        //                             complaintAssignment: {
        //                                 user: {
        //                                     issueIncharge: {
        //                                         locationId: {
        //                                             in: filterByLocations
        //                                         }
        //                                     }
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             status: {
        //                                 in: filterByStatus
        //                             }
        //                         }
        //                     ]
        //                 },
        //             }, 
        //             {
        //                 tagId: {
        //                     in: filterByTags
        //                 }
        //             }
        //         ]
        //     },
        //     orderBy: {
        //         complaints: {
        //             createdAt: "desc" // get recent complaints first
        //         }
        //     },
        //     include: {
        //         complaints: {
        //             include: {
        //                 attachments: {
        //                     select: {
        //                         id: true,
        //                         imageUrl: true
        //                     }
        //                 },
        //                 tags: {
        //                     select: {
        //                         tags: {
        //                             select: {
        //                                 tagName: true
        //                             }
        //                         }
        //                     }
        //                 },
        //                 user: {
        //                     select: {

        //                         name: true,
        //                         email: true,
        //                         phoneNumber: true,
        //                     }
        //                 },
        //                 complaintAssignment: {
        //                     select: {
        //                         assignedAt: true,
        //                         user: {
        //                             select: {
        //                                 id: true,
        //                                 name: true,
        //                                 phoneNumber: true,
        //                                 issueIncharge: {
        //                                     select: {
        //                                         designation: {
        //                                             select: {
        //                                                 designation: {
        //                                                     select: {
        //                                                         designationName: true,
        //                                                     }
        //                                                 },
        //                                                 rank: true,
        //                                             }
        //                                         },
        //                                         location: true,
        //                                     }
        //                                 }
        //                             }
        //                         }
        //                     }
        //                 },
        //             },
        //         }
        //     }
        // });

        let complaints = await prisma.complaint.findMany({
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
                        tags: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
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
            },
        });

        if (!complaints) {
            throw new Error("Could not fetch the required complaint");
        }

        complaints = complaints.filter((complaint: any) => {
            return (filterByLocations && filterByLocations.length > 0) ? filterByLocations.includes(complaint.complaintAssignment.user.issueIncharge.location.id) : true;
        });

        complaints = complaints.filter((complaint: any) => {
            return (filterByTags && filterByTags.length > 0) ? complaint.tags.some((tag: any) => filterByTags.includes(tag.tags.id)) : true;
        });

        complaints = complaints.filter((complaint: any) => {
            return (filterByStatus && filterByStatus.length > 0) ? filterByStatus.includes(complaint.status) : true;
        });

        let complaintResponse: any = [];

        complaints.forEach((complaint: any) => {
            if (complaint.postAsAnonymous) {
                complaintResponse.push({
                    ...complaint,
                    user: {
                        id: complaint.user.id,
                        name: "Anonymous",
                        email: complaint.user.email,
                        phoneNumber: complaint.user.phoneNumber
                    }  
                });
            } else {
                complaintResponse.push(complaint);
            }
        });
        
        if (userRole === "STUDENT" || userRole === "FACULTY") {
            complaintResponse = (requestComingFrom === "home")
                ? complaintResponse.filter((complaint: any) => complaint.access === "PUBLIC")
                : complaintResponse.filter((complaint: any) => complaint.access === "PUBLIC"
                    || (complaint.access === "PRIVATE" && complaint.userId === req.user.id));
        } else if (userRole === "ISSUE_INCHARGE") {
            complaintResponse = complaintResponse.filter((complaint: any) => complaint.complaintAssignment.user.id === req.user.id);
        }

        // all upvoted complaints by the currently logged in user
        const upvotedComplaints = await prisma.upvote.findMany({
            where: {
                userId: req.user.id
            },
            select: {
                complaintId: true
            }
        });

        const complaintDetails = complaintResponse.map((complaint: any) => {
            return {
                id: complaint.complaintId,
                title: complaint.title,
                description: complaint.description,
                access: complaint.access,
                postAsAnonymous: complaint.postAsAnonymous,
                status: complaint.status,
                actionTaken: complaint.actionTaken,
                upvotes: complaint.totalUpvotes,
                complainerId: complaint.userId,
                complainerName: complaint.user.name,
                complainerEmail: complaint.user.email,
                complainerPhone: complaint.user.phoneNumber,
                attachments: complaint.attachments.map((attachment: any) => attachment.imageUrl),
                tags: complaint.tags.map((tag: any) => tag.tags.tagName),
                assignedTo: complaint.complaintAssignment.user.name,
                inchargeId: complaint.complaintAssignment.user.id,
                inchargePhone: complaint.complaintAssignment.user.phoneNumber,
                designation: complaint.complaintAssignment.user.issueIncharge.designation.designation.designationName,
                inchargeRank: complaint.complaintAssignment.user.issueIncharge.designation.rank,
                location: complaint.complaintAssignment.user.issueIncharge.location.locationName,
                assignedAt: complaint.complaintAssignment.assignedAt,
                createdAt: complaint.createdAt,
                closedAt: complaint.closedAt,
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
            error: err instanceof Error ? err.message : "An error occurred while fetching the complaint at a location"
        });
    }
}

export const getComplaintsCreatedInLastNDays = async (req: any, res: any) => {
    try {
        const days = req.query.days;
        const userId = req.user.id;

        if (!days) {
            throw new Error("Please provide the number of days");
        }

        if (days < 0 || days > 90) {
            throw new Error("Days should be between 0 and 90");
        }

        const complaints = await prisma.complaint.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) - (days * 24 * 60 * 60 * 1000))
                }
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
            message: `Complaints created in last ${days} days`,
            complaintDetails,
            upvotedComplaints: upvotedComplaints.map((u: any) => u.complaintId),
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaints in last 7 days"
        });
    }
}

export const getComplaintHistory = async (req: any, res: any) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // check whether issue incharge is not accessing the history
        if (userRole === "ISSUE_INCHARGE") {
            throw new Error("Unauthorized Access.");
        }

        // check whether this complaint corresponds to the current user
        const complaintUserDetails = await prisma.complaint.findUnique({
            where: {
                id: complaintId,
            },
            select: {
                userId: true,
                user: {
                    select: {
                        issueIncharge: {
                            select: {
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
        });

        if (!complaintUserDetails) {
            throw new Error("Couldn't fetch complaint details.");
        }

        if (complaintUserDetails.userId !== userId) {
            throw new Error("Unauthorized Access.");
        }

        // fetch the complaint history
        const complaintHistory = await prisma.complaintHistory.findMany({
            where: {
                complaintId
            },
            include: {
                complaint: {
                    select: {
                        id: true,
                        title: true,
                        createdAt: true,
                        expiredAt: true,
                        updatedAt: true,
                    }
                },
                user: {
                    select: {
                        name: true,
                        role: true,
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
                        },
                        resolver: {
                            select: {
                                occupation: true,
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
        });

        if (!complaintHistory) {
            throw new Error("Couldn't fetch complaint history");
        }

        let response: any[] = [];
        complaintHistory.forEach((history: any) => {
            switch (history.eventType) {
                case "CREATED":
                    response.push({
                        createdBy: history.user.name,
                        createdAt: history.happenedAt
                    });
                    break;

                case "ASSIGNED":
                    response.push({
                        assignedTo: history.user.name,
                        designation: history.user.issueIncharge.designation.designation.designationName,
                        assignedAt: history.happenedAt,
                        expiredAt: history.complaint.expiredAt
                    });
                    break;

                case "DELEGATED":
                    response.push({
                        delegatedTo: history.user.name,
                        occupation: history.user.resolver.occupation.occupationName,
                        delegatedAt: history.happenedAt,
                        expiredAt: history.complaint.expiredAt
                    });
                    break;

                case "ESCALATED":
                    response.push({
                        escalatedTo: history.user.name,
                        designation: history.user.issueIncharge.designation.designation.designationName,
                        escalatedAt: history.happenedAt,
                        expiredAt: history.complaint.expiredAt
                    });
                    break;

                case "RESOLVED":
                    response.push({
                        resolvedBy: history.user.name,
                        designation: history.user.issueIncharge.designation.designationName,
                        resolvedAt: history.happenedAt,
                    });
                    break;

                case "CLOSED":
                    response.push({
                        closedBy: history.handledBy,
                        closedAt: history.happenedAt
                    });
                    break;
            }
        });

        res.status(200).json({
            ok: true,
            complaintId,
            title: complaintHistory[0].complaint.title,
            location: complaintUserDetails.user.issueIncharge?.location.locationName,
            complaintHistory: response
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the complaint history.",
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

export const updateComplaintById = async (req: any, res: any) => {
    try {
        const body = req.body; // { title: string, description: string, access: string, postAsAnonymous: boolean, tags: Array<Int>, attachments: Array<String> }
        const parseData = UpdateComplaintSchema.safeParse(body);
        const complaintId = req.params.id;
        const currentUserId = req.user.id;

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        const doesComplaintBelongToLoggedInUser = await prisma.complaint.findUnique({
            where: { id: complaintId },
            select: {
                userId: true,
                status: true,
                complaintAssignment: {
                    select: {
                        user: {
                            select: {
                                issueIncharge: {
                                    select: {
                                        locationId: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!doesComplaintBelongToLoggedInUser) {
            throw new Error("No complaint exist with this given id");
        }

        // if status is not pending or assigned then don't let an user to update the complaint details
        if (doesComplaintBelongToLoggedInUser.status !== "PENDING" && doesComplaintBelongToLoggedInUser.status !== "ASSIGNED") {
            throw new Error("Complaint is already picked up. You cannot update the complaint details");
        }

        // check whether the complaintId belongs to the current user
        if (doesComplaintBelongToLoggedInUser.userId !== currentUserId) {
            throw new Error("Access Denied. You do not have permissions to make changes for this complaint.");
        }

        let tagData: any[] = [];
        let attachmentsData: any[] = [];

        parseData.data.tags.forEach(id => {
            tagData.push({ tagId: Number(id) });
        });

        parseData.data.attachments.forEach(url => {
            attachmentsData.push({ imageUrl: url });
        });

        let dataToUpdate: any = {
            title: parseData.data.title,
            description: parseData.data.description,
            access: parseData.data.access,
            postAsAnonymous: parseData.data.postAsAnonymous,
            tags: {
                deleteMany: [{ complaintId }], // delete existing tags 
                create: tagData // then create new tags which is given by the user
            },
            attachments: {
                deleteMany: [{ complaintId }], // same as tags
                create: attachmentsData
            },
            updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
        }

        const updateDetails = await prisma.$transaction(async (tx: any) => {
            const updateComplaint = await tx.complaint.update({
                where: { id: complaintId },
                data: dataToUpdate,
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

            if (!updateComplaint) {
                throw new Error("Could not create complaint. Please try again");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "complaint_updated",
                    payload: {
                        complaintId: updateComplaint.id,
                        complainerId: updateComplaint.userId,
                        title: updateComplaint.title,
                        description: updateComplaint.description,
                        access: updateComplaint.access,
                        postAsAnonymous: updateComplaint.postAsAnonymous,
                        status: UPDATED,
                        isAssignedTo: updateComplaint.complaintAssignment?.user?.id as string,
                        attachments: updateComplaint.attachments,
                        tags: updateComplaint.tags,
                        updatedAt: updateComplaint.updatedAt,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create complaint_update details in outbox.");
            }

            return updateComplaint;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });


        // check whether this user has upvoted this complaint
        let hasUpvoted: boolean = false;

        const upvote = await prisma.upvote.findFirst({
            where: { userId: currentUserId, complaintId },
            select: { id: true }
        });

        if (upvote) {
            hasUpvoted = true;
        }

        const tagNames = updateDetails.tags.map((tag: any) => tag.tags.tagName);
        const attachments = updateDetails.attachments.map((attachment: any) => attachment.imageUrl);

        let complaintResponse = updateDetails;

        if (updateDetails.postAsAnonymous) {
            complaintResponse = {
                ...updateDetails,
                user: {
                    id: updateDetails.user.id,
                    name: "Anonymous",
                }
            }
        }

        res.status(200).json({
            ok: true,
            message: "Complaint updated successfully",
            complaintId: complaintResponse.id,
            title: complaintResponse.title,
            description: complaintResponse.description,
            access: complaintResponse.access,
            postAsAnonymous: complaintResponse.postAsAnonymous,
            userId: complaintResponse.user.id,
            userName: complaintResponse.user.name,
            hasUpvoted,
            status: complaintResponse.status,
            inchargeId: complaintResponse.complaintAssignment?.user?.id,
            inchargeName: complaintResponse.complaintAssignment?.user?.name,
            inchargeDesignation: complaintResponse.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
            location: complaintResponse.complaintAssignment?.user?.issueIncharge?.location.locationName,
            upvotes: complaintResponse.totalUpvotes,
            actionTaken: complaintResponse.actionTaken,
            attachments: attachments,
            tags: tagNames,
            assignedAt: complaintResponse.complaintAssignment?.assignedAt,
            createdAt: complaintResponse.createdAt,
            expiredAt: complaintResponse.expiredAt,
            updatedAt: complaintResponse.updatedAt
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while updating the complaint"
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
            select: {
                id: true,
                complaint: {
                    select: {
                        access: true,
                        userId: true,
                    }
                }
            }
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

        const upvotes = await prisma.$transaction(async (tx: any) => {
            // count total upvotes for a complaint
            const upvoteComplaint = await tx.complaint.update({
                where: { id: complaintId },
                data: {
                    totalUpvotes: finalAction
                },
                select: {
                    title: true,
                    userId: true,
                    access: true,
                    totalUpvotes: true,
                    complaintAssignment: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!upvoteComplaint) {
                throw new Error("Could not upvote the complaint");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "complaint_upvoted",
                    payload: {
                        complaintId,
                        complainerId: upvoteComplaint.userId,
                        access: upvoteComplaint.access,
                        title: upvoteComplaint.title,
                        upvotes: upvoteComplaint.totalUpvotes,
                        hasUpvoted: hasUpvoted ? false : true,
                        isAssignedTo: upvoteComplaint.complaintAssignment?.user?.id as string,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create complaint_upvoted event in outbox.");
            }

            return upvoteComplaint;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
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
