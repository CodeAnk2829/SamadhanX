import { PrismaClient } from '@prisma/client';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    try {
        const tags = await prisma.tag.createMany({
            data: [
                { tagName: "Hostel" },
                { tagName: "Department" },
                { tagName: "Mess" },
                { tagName: "Cleaning" },
                { tagName: "Sports" },
                { tagName: "Data Center" },
                { tagName: "Internet" },
                { tagName: "WiFi" },
                { tagName: "LAN" },
                { tagName: "Electricity" },
                { tagName: "Equipment" },
                { tagName: "Carpentry" },
                { tagName: "Dispensary" },
                { tagName: "Ambulance" },
                { tagName: "Medical Service" },
                { tagName: "Canteen" },
                { tagName: "Library" },
                { tagName: "Bus Service" },
                { tagName: "Ragging" },
                { tagName: "Personal Issue" },
                { tagName: "Lab" },
                { tagName: "Lift" },
                { tagName: "Vending machine" },
                { tagName: "Projector" },
                { tagName: "Classroom" },
                { tagName: "Stationary" },
                { tagName: "Furniture" },
                { tagName: "Plumbing" },
                { tagName: "Gardening" },
                { tagName: "Security" },
                { tagName: "Parking" },
                { tagName: "Water" },
                { tagName: "All" },
                { tagName: "Others" }
            ]
        });

        if (!tags) {
            throw new Error("Could not create tags");
        }

        console.log("Tags created successfully");

        const designations = await prisma.designation.createMany({
            data: [
                { designationName: "HOD" },
                { designationName: "Chief of Warden (COW)" },
                { designationName: "Warden" },
                { designationName: "Assistant Warden" },
                { designationName: "Care Taker" },
                { designationName: "Mess Convener" },
                { designationName: "Technical Head" },
                { designationName: "Library Incharge" },
                { designationName: "Others" }
            ]
        });

        if (!designations) {
            throw new Error("Could not create designations");
        }

        console.log("Designations created successfully");

        const occupations = await prisma.occupation.createMany({
            data: [
                { occupationName: "Cleaner" },
                { occupationName: "Electrician" },
                { occupationName: "Plumber" },
                { occupationName: "Watchman" },
                { occupationName: "Ambulance Driver" },
            ]
        });

        if (!occupations) {
            throw new Error("Could not create occupations");
        }

        console.log("Occupations created successfully");

        // create admin, some students
        const createUsers = await prisma.user.createMany({
            data: [{
                name: "Admin",
                email: "admin@gmail.com",
                phoneNumber: "0000000000",
                password: bcrypt.hashSync("test@123", 10),
                role: "ADMIN"
            }, {
                name: "Ankit",
                email: "ankit@gmail.com",
                phoneNumber: "2222222222",
                password: bcrypt.hashSync("test@123", 10),
                role: "STUDENT"
            }, {
                name: "Suhaani",
                email: "suhaani@gmail.com",
                phoneNumber: "2222222221",
                password: bcrypt.hashSync("test@123", 10),
                role: "STUDENT"
            }, {
                name: "Zanjabila",
                email: "zanja@gmail.com",
                phoneNumber: "2222222223",
                password: bcrypt.hashSync("test@123", 10),
                role: "FACULTY"
            },]
        });

        if (!createUsers) {
            throw new Error("Could not create users");
        }

        // set locations
        const setLocations = await prisma.location.createMany({
            data: [{
                locationName: "Hostel-10A",
                tagId: 1
            }, {
                locationName: "Hostel-12A",
                tagId: 1
            }, {
                locationName: "CSE-A",
                tagId: 2
            }]
        });

        if (!setLocations) {
            throw new Error("Could not set locations");
        }

        // set designations
        const setDesignations = await prisma.designationTag.createMany({
            data: [{
                designationId: 2,
                tagId: 1,
                rank: 1
            }, {
                designationId: 3,
                tagId: 1,
                rank: 2
            }, {
                designationId: 4,
                tagId: 1,
                rank: 3
            }, {
                designationId: 5,
                tagId: 1,
                rank: 4
            }]
        });

        if (!setDesignations) {
            throw new Error("Could not set designations");
        }

        // set occupations
        const setOccupations = await prisma.occupationTag.createMany({
            data: [{
                occupationId: 1,
                tagId: 1
            }, {
                occupationId: 1,
                tagId: 2
            }, {
                occupationId: 1,
                tagId: 3
            }, {
                occupationId: 1,
                tagId: 4
            }, {
                occupationId: 2,
                tagId: 1
            }, {
                occupationId: 2,
                tagId: 2
            }, {
                occupationId: 2,
                tagId: 10
            },]
        });

        if (!setOccupations) {
            throw new Error("Could not set occupations");
        }

        // assign warden
        const assignWarden = await prisma.user.create({
            data: {
                name: "Warden h10a",
                email: "warden.h10a@gmail.com",
                phoneNumber: "1111111111",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 1
                            }
                        },
                        designation: {
                            connect: {
                                id: 2
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignWarden) {
            throw new Error("Could not assign warden");
        }

        const assignWarden2 = await prisma.user.create({
            data: {
                name: "Warden h12a",
                email: "warden.h12a@gmail.com",
                phoneNumber: "1111111112",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 2
                            }
                        },
                        designation: {
                            connect: {
                                id: 2
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignWarden2) {
            throw new Error("Could not assign warden");
        }

        // assign asst warden
        const assignAsstWarden = await prisma.user.create({
            data: {
                name: "Assistant Warden h10a",
                email: "asstwarden.h10a@gmail.com",
                phoneNumber: "1111111113",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 1
                            }
                        },
                        designation: {
                            connect: {
                                id: 3
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignAsstWarden) {
            throw new Error("Could not assign asst warden");
        }

        const assignAsstWarden2 = await prisma.user.create({
            data: {
                name: "Assistant Warden h12a",
                email: "asstwarden.h12a@gmail.com",
                phoneNumber: "1111111114",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 2
                            }
                        },
                        designation: {
                            connect: {
                                id: 3
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignAsstWarden2) {
            throw new Error("Could not assign asst warden");
        }

        // assign care taker
        const assignCaretaker = await prisma.user.create({
            data: {
                name: "Care Taker h10a",
                email: "caretaker.h10a@gmail.com",
                phoneNumber: "1111111115",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 1
                            }
                        },
                        designation: {
                            connect: {
                                id: 4
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignCaretaker) {
            throw new Error("Could not assign caretaker");
        }

        const assignCaretaker2 = await prisma.user.create({
            data: {
                name: "Care Taker h12a",
                email: "caretaker.h12a@gmail.com",
                phoneNumber: "1111111116",
                password: bcrypt.hashSync("test@123", 10),
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: 2
                            }
                        },
                        designation: {
                            connect: {
                                id: 4
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignCaretaker2) {
            throw new Error("Could not assign caretaker");
        }

        // assign cleaner
        const assignCleaner = await prisma.user.create({
            data: {
                name: "Cleaner h10a",
                email: "cleaner.h10a@gmail.com",
                phoneNumber: "4444444444",
                password: bcrypt.hashSync("test@123", 10),
                role: "RESOLVER",
                resolver: {
                    create: {
                        location: {
                            connect: {
                                id: 1
                            }
                        },
                        occupation: {
                            connect: {
                                id: 1
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignCleaner) {
            throw new Error("Could not assign cleaner");
        }

        const assignCleaner2 = await prisma.user.create({
            data: {
                name: "Cleaner h12a",
                email: "cleaner.h12a@gmail.com",
                phoneNumber: "4444444445",
                password: bcrypt.hashSync("test@123", 10),
                role: "RESOLVER",
                resolver: {
                    create: {
                        location: {
                            connect: {
                                id: 2
                            }
                        },
                        occupation: {
                            connect: {
                                id: 1
                            }
                        }
                    }
                },
                createdAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(new Date(Date.now()).getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
        });

        if (!assignCleaner2) {
            throw new Error("Could not assign cleaner");
        }

        // create some complaints
        // find the least ranked incharge of the hostel of the given location
        const issueIncharge = await prisma.issueIncharge.findFirst({
            where: {
                locationId: 1
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

        // find a student 
        const firstStudent = await prisma.user.findFirst({
            where: {
                role: "STUDENT",
            },
            select: {
                id: true,
            }
        });

        if (!firstStudent) {
            throw new Error("Could not find first student");
        }

        const currentDateTime = Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000);

        const createComplaint = await prisma.$transaction(async (tx: any) => {
            const complaintDetails = await tx.complaint.create({
                data: {
                    title: "Washroom is not cleaned.",
                    description: "For the past 3 days washroom is not cleaned but no action has been taken yet",
                    access: "PUBLIC",
                    postAsAnonymous: false,
                    complaintAssignment: {
                        create: {
                            assignedTo: issueIncharge.inchargeId,
                            assignedAt: new Date(currentDateTime).toISOString()
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
                                    handledBy: firstStudent.id,
                                    happenedAt: new Date(currentDateTime)
                                },
                                {
                                    eventType: "ASSIGNED",
                                    handledBy: issueIncharge.inchargeId,
                                    happenedAt: new Date(currentDateTime)
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
                            givenAt: new Date(currentDateTime)
                        }
                    },
                    user: {
                        connect: {
                            id: firstStudent.id
                        }
                    },
                    status: "ASSIGNED",
                    tags: {
                        create: []
                    },
                    attachments: {
                        create: []
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
                    processAfter: new Date(currentDateTime).toISOString()
                }
            });

            if (!outboxDetails) {
                throw new Error("Could not create outbox details.");
            }

            return complaintDetails;
        });


        if (!createComplaint) {
            throw new Error("Could not create complaint. Please try again");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();