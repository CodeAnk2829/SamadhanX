import { prisma } from "@repo/db/client";


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


        if(!complaintDetails) {
            throw new Error("Could not find complaint details.");
        }


        // check whether this complaint is assigned to currently logged in incharge
        if(complaintDetails.complaintAssignment?.user?.id !== currentIncharge.id) {
            throw new Error("You are not assigned to this complaint.");
        }

        const locationId = complaintDetails.complaintAssignment?.user?.issueIncharge?.location.id;
        const currentInchargeRank = complaintDetails.complaintAssignment?.user?.issueIncharge?.designation.rank;

        console.log(locationId);
        console.log(currentInchargeRank);
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

        if(!nextIncharge) {
            throw new Error("Could not find the next incharge.");
        }

        // // update the complaint with the next incharge
        const escalate = await prisma.complaint.update({
            where: { id: complaintId },
            data: {
                complaintAssignment: {
                    update: {
                        assignedTo: nextIncharge.incharge.id
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

        if(!escalate) {
            throw new Error("Escalation failed.");
        }

        res.status(200).json({
            ok: true,
            message: "Complaint escalated successfully.", 
            // data: escalate
            complaintDetails,
            nextIncharge,
            escalate
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while escalating the complaint."
        });
    }
}

export const getAllComplaintsAssignedToIncharge = async (req: any, res: any) => {
    try {
        const currentIncharge = req.user;

        const complaints = await prisma.complaint.findMany({
            where: {
                complaintAssignment: {
                    assignedTo: currentIncharge.id
                }
            },
            orderBy: {
                createdAt: "desc"
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
            }
        });

        if(!complaints) {
            throw new Error("Could not find complaints assigned to you.");
        }

        res.status(200).json({
            ok: true, 
            complaints
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching complaints."
        });
    }
}

