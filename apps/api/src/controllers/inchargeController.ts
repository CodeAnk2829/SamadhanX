import { prisma } from "@repo/db/client";
import { DelegateSchema } from "@repo/types/inchargeTypes";


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
        
        const delegate = await prisma.$transaction([
            // Update complaint delegation
            prisma.complaintDelegation.update({
                where: {
                    complaintId
                },
                data: {
                    delegateTo: resolverId,
                    delegatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                },
                select: {
                    user: {
                        select: {
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
            }),

            // Update complaint status
            prisma.complaint.update({
                where: {
                    id: complaintId
                },
                data: {
                    status: "DELEGATED",
                    actionTaken: true
                }
            }),
        ]);

        if (!delegate) {
            throw new Error("Delegation failed.");
        }

        const resolverDetails = {
            name: delegate[0].user?.name,
            email: delegate[0].user?.email,
            phoneNumber: delegate[0].user?.phoneNumber,
            occupation: delegate[0].user?.resolver?.occupation?.occupationName,
            status: delegate[1].status,
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

        // update the complaint with the next incharge
        const escalate = await prisma.complaint.update({
            where: { id: complaintId },
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

        if (!escalate) {
            throw new Error("Escalation failed.");
        }

        const escalationDetails = {
            complaintId: escalate.id,
            title: escalate.title,
            status: escalate.status,
            createdAt: escalate.createdAt,
            assignedAt: escalate.complaintAssignment?.assignedAt,
            expiredAt: escalate.expiredAt,
            assignedTo: escalate.complaintAssignment?.user?.name,
            designation: escalate.complaintAssignment?.user?.issueIncharge?.designation.designation.designationName,
            rank: escalate.complaintAssignment?.user?.issueIncharge?.designation.rank,
            location: escalate.complaintAssignment?.user?.issueIncharge?.location.locationName,
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
                status: "ASSIGNED",
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
                complainerName: complaint.user.name,
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
                }
            }
        });


        if (!complaintDetails) {
            throw new Error("Could not find complaint details.");
        }


        // check whether this complaint is assigned to currently logged in incharge
        if (complaintDetails.complaintAssignment?.user?.id !== currentInchargeId) {
            throw new Error("You are not assigned to this complaint.");
        }

        if (complaintDetails.complaintResolution?.resolvedBy) {
            throw new Error("")
        }

        const resolvedComplaint = await prisma.$transaction([
            prisma.complaintResolution.update({
                where: {
                    complaintId
                },
                data: {
                    resolvedBy: currentInchargeId,
                    resolvedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
                },
                select: {
                    complaint: {
                        select: {
                            id: true,
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
            }),
            
            prisma.complaint.update({
                where: {
                    id: complaintId
                },
                data: {
                    status: "RESOLVED",
                    actionTaken: true
                }
            }),

            prisma.complaintOutbox.delete({
                where: {
                    complaintId
                }
            })
        ]);

        if (!resolvedComplaint) {
            throw new Error("Could not resolve complaint");
        }

        const complaintResolutionDetails = {
            complaintId: resolvedComplaint[0].complaint.id,
            status: resolvedComplaint[1].status,
            resolvedBy: resolvedComplaint[0].user,
            resolvedAt: resolvedComplaint[0].resolvedAt
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
