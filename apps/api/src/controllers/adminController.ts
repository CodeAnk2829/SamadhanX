import bcrypt from "bcryptjs";
import { prisma } from "@repo/db/client";
import { InchargeSchema, RemoveSchema, ResolverSchema, UpdateInchargeSchema, UpdateResolverSchema } from "@repo/types/adminTypes";


export const assignIncharge = async (req: any, res: any) => {
    try {
        const body = req.body; // { name: String, email: String, phoneNumber: string, role: String, locationId: Int, designationTagId: Int }
        const parseData = InchargeSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        if(parseData.data.role !== "ISSUE_INCHARGE") {
            throw new Error("Invalid role");
        }
        
        // check for existing user
        const isUserExisted = await prisma.user.findUnique({
            where: {
                email: parseData.data.email
            }
        });

        if (isUserExisted) {
            throw new Error("User already exists");
        }

        const password = bcrypt.hashSync(process.env.INCHARGE_PASSWORD as string, 10);

        const newIncharge = await prisma.user.create({
            data: {
                name: parseData.data.name,
                email: parseData.data.email,
                phoneNumber: parseData.data.phoneNumber,
                password: password,
                role: parseData.data.role as "ISSUE_INCHARGE",
                issueIncharge: {
                    create: {
                        location: {
                            connect: {
                                id: parseData.data.locationId
                            }
                        },
                        designation: {
                            connect: {
                                id: parseData.data.designationTagId
                            }
                        }
                    }
                }
            },
            select: {
                id: true, 
                name: true,
                email: true,
                phoneNumber: true,
                issueIncharge: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                            }
                        },
                        designation: {
                            select: {
                                designation: {
                                    select: {
                                        designationName: true
                                    }
                                },
                                rank: true,
                            }
                        }
                    }
                }
            }
        });

        if (!newIncharge) {
            throw new Error("Could not create new incharge. Please try again.");
        }

        res.status(201).json({
            ok: true,
            message: "Incharge assigned successfully",
            inchargeId: newIncharge.id,
            name: newIncharge.name,
            email: newIncharge.email,
            phoneNumber: newIncharge.phoneNumber,
            location: newIncharge.issueIncharge?.location.locationName,
            desination: newIncharge.issueIncharge?.designation.designation.designationName,
            rank: newIncharge.issueIncharge?.designation.rank
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while assigning incharge. Please try again."
        });
    }
}

export const assignResolver = async (req: any, res: any) => {
    try {
        const body = req.body; // { name: String, email: String, phoneNumber: string, role: String, locationId: Int, occupationId: Int }
        const parseData = ResolverSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        if(parseData.data.role !== "RESOLVER") {
            throw new Error("Invalid role");
        }

        const password = bcrypt.hashSync(process.env.RESOLVER_PASSWORD as string, 10);

        const newResolver = await prisma.user.create({
            data: {
                name: parseData.data.name,
                phoneNumber: parseData.data.phoneNumber,
                email: parseData.data.email,
                password,
                role: parseData.data.role,
                resolver: {
                    create: {
                        location: {
                            connect: {
                                id: parseData.data.locationId
                            }
                        },
                        occupation: {
                            connect: {
                                id: parseData.data.occupationId
                            }
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                resolver: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                            }
                        },
                        occupation: {
                            select: {
                                occupationName: true,
                                occupationTag: {
                                    select: {
                                        tag: {
                                            select: {
                                                tagName: true,
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

        if (!newResolver) {
            throw new Error("Could not create resolver.");
        }

        const tagsRelatedToNewResolver = newResolver.resolver?.occupation.occupationTag.map((o: any) => o.tag.tagName );

        res.status(201).json({
            ok: true,
            message: "Resolver created successfully",
            id: newResolver.id,
            name: newResolver.name,
            email: newResolver.email,
            phoneNumber: newResolver.phoneNumber,
            location: newResolver.resolver?.location.locationName,
            occupation: newResolver.resolver?.occupation.occupationName,
            tags: tagsRelatedToNewResolver,
            createdAt: newResolver.createdAt
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while assigning resolver. Please try again."
        });
    }
}

export const createDesignations = async (req: any, res: any) => {
    try {
        const { designations } = req.body; // { designations: Array<String> }

        const dataToCreate = designations.map((designation: string) => {
            return { designationName: designation }
        });

        const newDesignations = await prisma.designation.createMany({ data: dataToCreate });

        if(!newDesignations) {
            throw new Error("Could not set designations.");
        }

        res.status(201).json({
            ok: true,
            message: "Designations are set successfully",
            newDesignations
        });
    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the occupations."
        });
    }
}

export const createOccupations = async (req: any, res: any) => {
    try {
        const { occupations } = req.body; // { occupations: Array<String> }

        const dataToCreate = occupations.map((occupation: string) => {
            return { occupationName: occupation }
        });

        const newOccupations = await prisma.occupation.createMany({ data: dataToCreate });

        if (!newOccupations) {
            throw new Error("Could not set occupations.");
        }

        res.status(201).json({
            ok: true,
            message: "Occupations are set successfully",
            newOccupations
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the occupations."
        });
    }
}

export const createTags = async (req: any, res: any) => {
    try {
        const tags = req.body.tags; // { tags: Array<String> }

        if (tags.length === 0) {
            throw new Error("Invalid inputs");
        }

        const totalTags: any[] = [];

        tags.forEach((tag: string) => {
            totalTags.push({ tagName: tag });
        });

        const newTags = await prisma.tag.createMany({
            data: totalTags
        });

        if (!newTags) {
            throw new Error("Could not create tags. Please try again.");
        }

        res.status(201).json({
            ok: true,
            message: "Tags created successfully",
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while creating tags. Please try again."
        });
    }
}

export const getDesignations = async (req: any, res: any) => {
    try {
        const allDesignations = await prisma.designation.findMany({
            select: {
                id: true,
                designationName: true,
                designationTag: {
                    select: {
                        rank: true,
                        tag: {
                            select: {
                                tagName: true,
                            }
                        }
                    }
                }
            }
        });

        if(!allDesignations) {
            throw new Error("Could not fetch the designations.");
        }

        const designationDetails = allDesignations.map((des: any) => {
            return {
                id: des.id,
                designation: des.designationName,
                tag: des.designationTag?.tag?.tagName,
                rank: des.designationTag?.rank,
            }
        });

        res.status(200).json({
            ok: true,
            message: "Successfully fetched the designations",
            designationDetails
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching all designations."
        });
    }
}

export const getIncharges = async (req: any, res: any) => {
    try {
        const incharges = await prisma.user.findMany({
            where: {
                role: "ISSUE_INCHARGE"
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                issueIncharge: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                                tag: {
                                    select: {
                                        tagName: true,
                                    }
                                },
                            }
                        },
                        designation: {
                            select: {
                                designation: {
                                    select: {
                                        designationName: true,
                                    }
                                },
                                rank: true
                            }
                        },
                    }
                },
                createdAt: true
            }
        });

        if (!incharges) {
            throw new Error("Could not fetch incharges. Please try again.");
        }

        const inchargeDetails = incharges.map((incharge: any) => {
            return {
                id: incharge.id,
                name: incharge.name,
                email: incharge.email,
                phoneNumber: incharge.phoneNumber,
                location: incharge.issueIncharge.location.locationName,
                tag: incharge.issueIncharge.location.tag.tagName,
                designation: incharge.issueIncharge.designation.designation.designationName,
                rank: incharge.issueIncharge.designation.rank,
                createdAt: incharge.createdAt,
            }
        });

        res.status(200).json({
            ok: true,
            inchargeDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching incharges. Please try again."
        });
    }
}

export const getInchargesAtALocation = async (req: any, res: any) => {
    try {
        const inchargesAtParticularLocation = await prisma.user.findMany({
            where: {
                role: "ISSUE_INCHARGE",
                issueIncharge: {
                    locationId: parseInt(req.params.locationId)
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                issueIncharge: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                                tag: {
                                    select: {
                                        tagName: true,
                                    }
                                },
                            }
                        },
                        designation: {
                            select: {
                                designation: {
                                    select: {
                                        designationName: true,
                                    }
                                },
                                rank: true
                            }
                        },
                    }
                },
                createdAt: true
            }
        });

        if (!inchargesAtParticularLocation) {
            throw new Error("Could not fetch incharges at a particular location. Please try again.");
        }

        const inchargeDetails = inchargesAtParticularLocation.map((incharge: any) => {
            return {
                id: incharge.id,
                name: incharge.name,
                email: incharge.email,
                phoneNumber: incharge.phoneNumber,
                location: incharge.issueIncharge.location.locationName,
                tag: incharge.issueIncharge.location.tag.tagName,
                designation: incharge.issueIncharge.designation.designation.designationName,
                rank: incharge.issueIncharge.designation.rank,
                createdAt: incharge.createdAt,
            }
        });

        res.status(200).json({
            ok: true,
            inchargeDetails
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching incharges. Please try again."
        });
    }
}

export const getLocations = async (req: any, res: any) => {
    try {
        const locations = await prisma.location.findMany({
            select: {
                id: true,
                locationName: true,
            }
        });

        if (!locations) {
            throw new Error("Could not fetch locations.");
        }

        res.status(200).json({
            ok: true,
            locations
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching locations. Please try again."
        });
    }
}

export const getLocationsDesignationsAndOccupationsBasedOnTag = async (req: any, res: any) => {
    try {
        const tagId = Number(req.params.tagId);
        
        const tagDetails = await prisma.tag.findUnique({
            where: {  id: tagId },
            include: {
                locations: {
                    select: {
                        id: true,
                        locationName: true,
                    }
                },
                designations: {
                    select: {
                        id: true,
                        designation: {
                            select: {
                                designationName: true,
                            }
                        }
                    }
                },
                occupationTag: {
                    select: {
                        occupation: true
                    }
                }
            }
        });

        if(!tagDetails) {
            throw new Error("Could not fetch tag details");
        }

        const designationDetails = tagDetails.designations.map((des: any) => {
            return {
                id: des.id, // designationTagId
                designation: des.designation.designationName
            }
        });

        const occupationDetails = tagDetails.occupationTag.map((o: any) => {
            return {
                id: o.occupation.id, // occupationId
                occupation: o.occupation.occupationName,
            }
        });

        res.status(200).json({
            ok: true,
            message: "Successfully get tag details",
            locationDetails: tagDetails.locations,
            designationDetails,
            occupationDetails
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the tag details."
        });
    }
}

export const getOccupations = async (req: any, res: any) => {
    try {
        const allOccupations = await prisma.occupation.findMany({
            select: {
                id: true,
                occupationName: true,
                occupationTag: {
                    select: {
                        tag: {
                            select: {
                                tagName: true,
                            }
                        }
                    }
                }
            }
        });

        if(!allOccupations) {
            throw new Error("Could not fetch the occupations.");
        }

        const occupationDetails = allOccupations.map((o: any) => {
            return {
                id: o.id,
                occupation: o.occupationName,
                tags: o.occupationTag.map((ot: any) => ot.tag.tagName),
            }
        });

        res.status(200).json({
            ok: true,
            message: "Successfully fetched the occupations",
            occupationDetails
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching all occupations."
        });
    }
}

export const getResolvers = async (req: any, res: any) => {
    try {
        const resolvers = await prisma.user.findMany({
            where: { role: "RESOLVER" },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                resolver: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                            }
                        },
                        occupation: {
                            select: {
                                occupationName: true,
                                occupationTag: {
                                    select: {
                                        tag: {
                                            select: {
                                                tagName: true,
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

        if (!resolvers) {
            throw new Error("Could not fetch resolvers. Please try again.");
        }
        
        const resolversDetails = resolvers.map((r: any) => {
            return {
                id: r.id,
                name: r.name,
                email: r.email,
                phoneNumber: r.phoneNumber,
                location: r.resolver.location.locationName,
                occupation: r.resolver.occupation.occupationName,
                tags: r.resolver.occupation.occupationTag.map((o: any) => o.tag.tagName ),
                createdAt: r.createdAt,
            }
        });

        res.status(200).json({
            ok: true,
            message: "Resolver created successfully",
            resolversDetails
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching resolvers. Please try again."
        });
    }
}

export const getResolversAtALocation = async (req: any, res: any) => {
    try {
        const locationId = parseInt(req.params.locationId);

        const resolversAtParticularLocation = await prisma.user.findMany({
            where: { 
                role: "RESOLVER",
                resolver: { locationId }
            }, 
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                resolver: {
                    select: {
                        location: {
                            select: {
                                locationName: true,
                            }
                        },
                        occupation: {
                            select: {
                                occupationName: true,
                                occupationTag: {
                                    select: {
                                        tag: {
                                            select: {
                                                tagName: true,
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

        if(!resolversAtParticularLocation) {
            throw new Error("Could not find resolvers at the given location");
        }

        const resolversDetails = resolversAtParticularLocation.map((r: any) => {
            return {
                id: r.id,
                name: r.name,
                email: r.email,
                phoneNumber: r.phoneNumber,
                location: r.resolver.location.locationName,
                occupation: r.resolver.occupation.occupationName,
                tags: r.resolver.occupation.occupationTag.map((o: any) => o.tag.tagName),
                createdAt: r.createdAt,
            }
        });

        res.status(200).json({
            ok: true,
            message: "Successfully fetched resolvers at the given location",
            resolversDetails
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the resolvers details at a particular location."
        });
    }
}

export const getTags = async (req: any, res: any) => {
    try {
        const tags = await prisma.tag.findMany({});

        if (!tags) {
            throw new Error("Could not fetch tags. Please try again.");
        }

        res.status(200).json({
            ok: true,
            tags
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching tags. Please try again."
        });
    }
}

export const getUsers = async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                createdAt: true
            }
        });

        if (!users) {
            throw new Error("Could not fetch users. Please try again.");
        }

        res.status(200).json({
            ok: true,
            users
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching users. Please try again."
        });
    }
}

export const setDesignation = async (req: any, res: any) => {
    try {
        const { designationId, tagId } = req.body;

        // first search for least ranked issue incharge for the given tag
        const rankDetails = await prisma.designationTag.findFirst({
            where: { tagId },
            orderBy: { rank: "desc" },
            select: { rank: true }
        });

        let rank = 0;

        if(!rankDetails) {
            rank = 1;
        } else {
            rank = (rankDetails?.rank as number) + 1;
        }

        const designationDetails = await prisma.designationTag.create({
            data: {
                designation: {
                    connect: {
                        id: designationId
                    }
                },
                tag: {
                    connect: {
                        id: tagId
                    }
                },
                rank
            },
            include: {
                designation: {
                    select: {
                        designationName: true,
                    }
                },
                tag: {
                    select: {
                        tagName: true,
                    }
                }
            }
        });

        if(!designationDetails) {
            throw new Error("Could not set designation details.");
        }

        res.status(201).json({
            ok: true,
            message: "Designation is set successfully.",
            designationTagId: designationDetails.id,
            designation: designationDetails.designation.designationName,
            tag: designationDetails.tag.tagName,
            rank: designationDetails.rank
        });
    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the designations."
        });
    }
}

export const setLocation = async (req: any, res: any) => {
    try {
        const { tagId, locationName } = req.body;
        const locationDetails = await prisma.location.create({
            data: {
                locationName,
                tag: {
                    connect: {
                        id: tagId
                    }
                }
            },
            include: {
                tag: true
            }
        });

        if(!locationDetails) {
            throw new Error("Could not set location.");
        }

        res.status(201).json({
            ok: true,
            message: "Location is set successfully",
            locationId: locationDetails.id,
            location: locationDetails.locationName,
            tag: locationDetails.tag.tagName
        });
    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the locations."
        });
    }
}

export const setOccupations = async (req: any, res: any) => {
    try {
        const { occupationId, tags } = req.body; // { occupationId: Int, tags: Array<Int> }

        const dataToCreate = tags.map((tagId: number) => {
            return {
                occupationId: occupationId,
                tagId: tagId
            }
        });

        const newOccupations = await prisma.occupationTag.createManyAndReturn({ 
            data: dataToCreate,
            include: {
                occupation: true,
                tag: true,
            }
        });

        if(!newOccupations) {
            throw new Error("Could not set occupation details");
        }

        res.status(201).json({
            ok: true,
            message: "Occupation details is set successfully.",
            newOccupations
        });

    } catch(err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the occupations."
        });
    }
}


