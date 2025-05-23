import { prisma } from "@repo/db/client";
import { DelegateSchema } from "@repo/types/inchargeTypes";
import { DELEGATED, ESCALATED, RESOLVED } from "@repo/types/wsMessageTypes";

export const delegateComplaint = async (req: any, res: any) => {
    try {
        const body = req.body // { complaintId: string, resolverId: string }
        const parseData = DelegateSchema.safeParse(body);
        const currentInchargeId = req.user.id;

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        const { complaintId, resolverId } = parseData.data;

        // find the current incharge details
        const complaintDetails = await prisma.complaint.findUnique({
            where: {
                id: complaintId
            },
            include: {
                complaintAssignment: {
                    select: {
                        assignedAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
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
                complaintDelegation: {
                    select: {
                        delegateTo: true,
                        delegatedAt: true,
                    }
                }
            }
        })


        if (!complaintDetails) {
            throw new Error("Could not find complaint details.");
        }

        // check whether this complaint is assigned to currently logged in incharge
        if (complaintDetails.complaintAssignment?.user?.id !== currentInchargeId) {
            throw new Error("You are not assigned to this complaint.");
        }

        // check whether the complaint has already delegated
        if (complaintDetails.status === "DELEGATED") {
            throw new Error(`This complaint has already been delegated at ${complaintDetails.complaintDelegation?.delegatedAt}`)
        }

        // check if the complaint is already resolved or closed
        if (complaintDetails.status === "CLOSED" || complaintDetails.status === "RESOLVED") {
            throw new Error("This complaint is already resolved or closed.");
        }

        console.log("delegation started");
        const delegate = await prisma.$transaction(async (tx: any) => {
            // Update complaint delegation
            const complaintDelegation = await tx.complaintDelegation.update({
                where: {
                    complaintId
                },
                data: {
                    delegateTo: resolverId,
                    delegatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                },
                include: {
                    complaint: {
                        select: {
                            status: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneNumber: true,
                            resolver: {
                                select: {
                                    occupation: {
                                        select: {
                                            occupationName: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!complaintDelegation) {
                throw new Error("Could not delegate a complaint");
            }

            // Update complaint status
            const updateComplaintAsDelegated = await tx.complaint.update({
                where: {
                    id: complaintId
                },
                data: {
                    status: "DELEGATED",
                    actionTaken: true,
                    complaintHistory: {
                        create: {
                            eventType: "DELEGATED",
                            handledBy: resolverId,
                            happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                }, 
                include: {
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
                    }
                }
            })

            if (!updateComplaintAsDelegated) {
                throw new Error("Could not update complaint status as delegated.");
            }

            const notifyUserAboutDelegation = await tx.notification.create({
                data: {
                    userId: complaintDetails.userId,
                    eventType: DELEGATED,
                    payload: {
                        complaintId: complaintDetails.id,
                        title: complaintDetails.title,
                        delegatedTo: complaintDelegation.user?.name,
                        delegatedBy: currentInchargeId,
                        occupation: complaintDelegation.user?.resolver?.occupation?.occupationName,
                        designation: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation?.designation?.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!notifyUserAboutDelegation) {
                throw new Error("Could not notify user about delegation");
            }

            const outboxDetails = await tx.complaintOutbox.create({
                data: {
                    eventType: "notify_resolver",
                    payload: {
                        complaintId,
                        complainerId: complaintDetails.userId,
                        access: complaintDetails.access,
                        title: updateComplaintAsDelegated.title,
                        description: updateComplaintAsDelegated.description,
                        isAssignedTo: currentInchargeId,
                        inchargePhoneNumber: updateComplaintAsDelegated.complaintAssignment?.user?.phoneNumber,
                        inchargeName: updateComplaintAsDelegated.complaintAssignment?.user?.name,
                        inchargeDesignation: updateComplaintAsDelegated.complaintAssignment?.user?.issueIncharge?.designation?.designation?.designationName,
                        location: updateComplaintAsDelegated.complaintAssignment?.user?.issueIncharge?.location?.locationName,
                        delegatedTo: complaintDelegation.delegateTo,
                        resolverName: complaintDelegation.user?.name,
                        resolverPhoneNumber: complaintDelegation.user?.phoneNumber,
                        occupation: complaintDelegation.user?.resolver?.occupation?.occupationName,
                        delegatedAt: complaintDelegation.delegatedAt
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create complaint_delegated event in outbox.");
            }

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

            return complaintDelegation;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });

        if (!delegate) {
            throw new Error("Delegation failed.");
        }

        const resolverDetails = {
            name: delegate.user?.name,
            email: delegate.user?.email,
            phoneNumber: delegate.user?.phoneNumber,
            occupation: delegate.user?.resolver?.occupation?.occupationName,
            status: "DELEGATED",
        }

        res.status(200).json({
            ok: true,
            message: "Complaint delegated successfully.",
            resolverDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while delegating the complaint."
        });
    }
}

export const escalateComplaint = async (req: any, res: any) => {
    try {
        const { complaintId } = req.body; // { complaintId: string }
        const currentIncharge = req.user;

        // find the current incharge details
        const complaintDetails = await prisma.complaint.findUnique({
            where: {
                id: complaintId
            },
            include: {
                complaintAssignment: {
                    select: {
                        assignedAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
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
                }
            }
        })

        if (!complaintDetails) {
            throw new Error("Could not find complaint details.");
        }

        // check whether this complaint is assigned to currently logged in incharge
        if (complaintDetails.complaintAssignment?.user?.id !== currentIncharge.id) {
            throw new Error("You are not assigned to this complaint.");
        }

        const locationId = complaintDetails.complaintAssignment?.user?.issueIncharge?.location.id;
        const currentInchargeRank = complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.rank;

        // find next incharge
        const nextIncharge = await prisma.issueIncharge.findFirst({
            where: {
                locationId,
                designation: {
                    rank: (currentInchargeRank as number) - 1
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
            throw new Error("Could not find the next incharge.");
        }

        const escalatedComplaint = await prisma.$transaction(async (tx: any) => {
            // update the complaint with next incharge
            const complaintEscalation = await tx.complaint.update({
                where: {
                    id: complaintId
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
                    expiredAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString(), // 2 mins after current time
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

            if (!complaintEscalation) {
                throw new Error("Could not escalate a complaint");
            }

            const notifyUserAboutEscalation = await tx.notification.create({
                data: {
                    userId: complaintEscalation.userId,
                    eventType: ESCALATED,
                    payload: {
                        complaintId: complaintEscalation.id,
                        title: complaintEscalation.title,
                        isEscalatedTo: complaintEscalation.complaintAssignment?.user?.name,
                        designation: complaintEscalation.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!notifyUserAboutEscalation) {
                throw new Error("Could not notify user about escalation");
            }

            const markEscalationDueAsProcessed = await tx.complaintOutbox.updateMany({
                where: {
                    AND: [
                        { eventType: "complaint_escalation_due" },
                        {
                            payload: {
                                path: ['complaintId'],
                                equals: complaintEscalation.id
                            }
                        }
                    ]
                },
                data: {
                    status: "PROCESSED"
                }
            });

            if (!markEscalationDueAsProcessed) {
                throw new Error("Could not mark escalation due as processed while manually escalating the complaint.");
            }

            const storeComplaintToPublishEscalation = await tx.complaintOutbox.createMany({
                data: [{
                    eventType: "complaint_escalated",
                    payload: {
                        complaintId: complaintEscalation.id,
                        complainerId: complaintEscalation.userId,
                        access: complaintEscalation.access,
                        title: complaintEscalation.title,
                        wasAssignedTo: currentIncharge.id,
                        isAssignedTo: complaintEscalation.complaintAssignment?.user?.id,
                        inchargeName: complaintEscalation.complaintAssignment?.user?.name,
                        designation: complaintEscalation.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }, {
                    eventType: "complaint_escalation_due",
                    payload: {
                        complaintId: complaintEscalation.id,
                        title: complaintEscalation.title,
                        inchargeId: complaintEscalation.complaintAssignment?.user?.id,
                        locationId: locationId,
                        rank: nextIncharge.designation.rank, // rank of currently escalated incharge
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString()
                }]
            });

            if (!storeComplaintToPublishEscalation) {
                throw new Error("Store escalated complaint details in outbox failed.");
            }

            return complaintEscalation;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });

        if (!escalatedComplaint) {
            throw new Error("Escalation failed. Please try again");
        }

        const escalationDetails = {
            complaintId: escalatedComplaint.id,
            title: escalatedComplaint.title,
            status: escalatedComplaint.status,
            createdAt: escalatedComplaint.createdAt,
            assignedAt: escalatedComplaint.complaintAssignment?.assignedAt,
            expiredAt: escalatedComplaint.expiredAt,
            assignedTo: escalatedComplaint.complaintAssignment?.user?.name,
            designation: escalatedComplaint.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
            rank: escalatedComplaint.complaintAssignment?.user?.issueIncharge?.designation.rank,
            location: escalatedComplaint.complaintAssignment?.user?.issueIncharge?.location.locationName,
        }

        res.status(200).json({
            ok: true,
            escalationDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while escalating the complaint."
        });
    }
}

// get all active complaints only assigned to a particular issue incharge
export const getActiveComplaintsAssignedToIncharge = async (req: any, res: any) => {
    try {
        const currentIncharge = req.user;

        const complaints = await prisma.complaint.findMany({
            where: {
                status: {
                    in: ["ASSIGNED", "RECREATED"]
                },
                complaintAssignment: {
                    assignedTo: currentIncharge.id
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                complaintAssignment: {
                    select: {
                        assignedAt: true,
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
                },
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
            }
        });

        if (!complaints) {
            throw new Error("Could not find complaints assigned to you.");
        }

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
                complainerName: complaint.postAsAnonymous ? "Anonymous" : complaint.user.name,
                attachments: complaint.attachments,
                tags: complaint.tags.map((tag: any) => tag.tags.tagName),
                location: complaint.complaintAssignment.user.issueIncharge.location.locationName,
                assignedAt: complaint.complaintAssignment.assignedAt,
                createdAt: complaint.createdAt,
                expiredAt: complaint.expiredAt,
            }
        });

        res.status(200).json({
            ok: true,
            complaintDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaints."
        });
    }
}

export const getAllComplaintsForWhichActionHasTaken = async (req: any, res: any) => {
    try {
        const currentInchargeId = req.user.id;

        const complaints = await prisma.complaint.findMany({
            where: {
                status: {
                    in: ["DELEGATED", "RESOLVED", "CLOSED"]
                },
                complaintAssignment: {
                    assignedTo: currentInchargeId
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                complaintAssignment: {
                    select: {
                        assignedAt: true,
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
                },
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
            }
        });

        if (!complaints) {
            throw new Error("Could not find complaints assigned to you.");
        }

        const complaintDetails = complaints.map((complaint) => ({
            id: complaint.id,
            title: complaint.title,
            description: complaint.description,
            access: complaint.access,
            postAsAnonymous: complaint.postAsAnonymous,
            status: complaint.status,
            actionTaken: complaint.actionTaken,
            upvotes: complaint.totalUpvotes,
            complainerId: complaint.userId,
            complainerName: complaint.postAsAnonymous ? "Anonymous" : complaint.user.name,
            attachments: complaint.attachments,
            tags: complaint.tags.map((tag) => tag.tags.tagName),
            locationAssignedToIncharge: complaint.complaintAssignment?.user?.issueIncharge?.location.locationName,
            assignedAt: complaint.complaintAssignment?.assignedAt,
            createdAt: complaint.createdAt,
        }));

        res.status(200).json({
            ok: true,
            complaintDetails
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the catered complaints complaints."
        });
    }
}

export const markComplaintAsResolved = async (req: any, res: any) => {
    try {
        const { complaintId } = req.body; // { complaintId: string }
        const currentInchargeId = req.user.id;

        // find the current incharge details
        const complaintDetails = await prisma.complaint.findUnique({
            where: {
                id: complaintId
            },
            include: {
                complaintAssignment: {
                    select: {
                        assignedAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
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
                complaintResolution: {
                    select: {
                        resolvedBy: true,
                        resolvedAt: true,
                    }
                },
                feedback: true
            }
        });


        if (!complaintDetails) {
            throw new Error("Could not find complaint details.");
        }


        // check whether this complaint is assigned to currently logged in incharge
        if (complaintDetails.complaintAssignment?.user?.id !== currentInchargeId) {
            throw new Error("You are not assigned to this complaint.");
        }

        if (complaintDetails.status === "RESOLVED") {
            throw new Error("Complaint already resolved.");
        }

        const resolvedComplaint = await prisma.$transaction(async (tx: any) => {
            const complaintResolution = await tx.complaintResolution.update({
                where: {
                    complaintId
                },
                data: {
                    resolvedBy: currentInchargeId,
                    resolvedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                },
                select: {
                    complaint: {
                        select: {
                            status: true,
                            userId: true,
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
                    resolvedAt: true,
                }
            });

            if (!complaintResolution) {
                throw new Error("Could not resolve the complaint.");
            }

            const markAsResolved = await tx.complaint.update({
                where: {
                    id: complaintId
                },
                data: {
                    status: "RESOLVED",
                    actionTaken: true,
                    complaintHistory: {
                        create: {
                            eventType: "RESOLVED",
                            handledBy: currentInchargeId,
                            happenedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                        }
                    },
                }
            });

            if (!markAsResolved) {
                throw new Error("Could not mark the complaint as resolved");
            }

            const notifyUserAboutResolution = await tx.notification.create({
                data: {
                    userId: complaintResolution.complaint.userId,
                    eventType: RESOLVED,
                    payload: {
                        complaintId: complaintDetails.id,
                        title: complaintDetails.title,
                        resolvedBy: complaintDetails.complaintAssignment?.user?.name,
                        designation: complaintDetails.complaintAssignment?.user?.issueIncharge?.designation?.designation?.designationName,
                    },
                    createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }
            });

            if (!notifyUserAboutResolution) {
                throw new Error("Could not notify user about complaint resolution.");
            }

            const outboxDetails = await tx.complaintOutbox.createMany({
                data: [{
                    eventType: "complaint_resolved",
                    payload: {
                        complaintId,
                        complainerId: complaintResolution.complaint.userId,
                        access: complaintDetails.access,
                        title: complaintDetails.title,
                        inchargeId: complaintDetails.complaintAssignment?.user?.id,
                        inchargeName: complaintDetails.complaintAssignment?.user?.name,
                        resolverDetails: complaintResolution.user,
                        resolvedAt: complaintResolution.resolvedAt,
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                }, {
                    eventType: "complaint_closure_due",
                    payload: {
                        complaintId,
                        complainerId: complaintResolution.complaint.userId,
                        isAssignedTo: complaintDetails.complaintAssignment?.user?.id,
                        access: complaintDetails.access,
                        title: complaintDetails.title,
                        closedAt: complaintDetails.closedAt,
                        feedback: {
                            id: complaintDetails.feedback?.id,
                            mood: complaintDetails.feedback?.mood,
                            remarks: complaintDetails.feedback?.remarks,
                            givenAt: complaintDetails.feedback?.givenAt,
                        }
                    },
                    status: "PENDING",
                    processAfter: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000) + (2 * 60 * 1000)).toISOString()
                }]
            });

            if (!outboxDetails) {
                throw new Error("Could not create complaint_resolved outbox details");
            }

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


            return complaintResolution;
        }, {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        });

        if (!resolvedComplaint) {
            throw new Error("Could not resolve complaint");
        }

        const complaintResolutionDetails = {
            complaintId,
            status: "RESOLVED",
            resolvedBy: resolvedComplaint.user,
            resolvedAt: resolvedComplaint.resolvedAt
        }

        res.status(200).json({
            ok: true,
            complaintResolutionDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while marking the complaint as resolved."
        });
    }
}