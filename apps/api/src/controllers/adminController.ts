import bcrypt from "bcryptjs";
import { prisma } from "@repo/db/client";
import { InchargeSchema, RemoveLocationSchema, RemoveSchema, RemoveTagSchema, ResolverSchema, UpdateInchargeSchema, UpdateResolverSchema } from "@repo/types/adminTypes";

export const assignIncharge = async (req: any, res: any) => {
    try {
        const body = req.body; // { name: String, email: String, phoneNumber: string, role: String, locationId: Int, designationTagId: Int }
        const parseData = InchargeSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        if (parseData.data.role !== "ISSUE_INCHARGE") {
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
                },
                createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
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
                                id: true,
                                designation: {
                                    select: {
                                        designationName: true
                                    }
                                },
                                rank: true,
                            }
                        }
                    }
                },
                createdAt: true,
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
            designationTagId: newIncharge.issueIncharge?.designation.id,
            desination: newIncharge.issueIncharge?.designation.designation.designationName,
            rank: newIncharge.issueIncharge?.designation.rank,
            createdAt: newIncharge.createdAt
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

        if (parseData.data.role !== "RESOLVER") {
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
                },
                createdAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
                updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
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
                        }
                    }
                }
            }
        });

        if (!newResolver) {
            throw new Error("Could not create resolver.");
        }

        const tagsRelatedToNewResolver = newResolver.resolver?.occupation.occupationTag.map((o: any) => o.tag.tagName);

        res.status(201).json({
            ok: true,
            message: "Resolver created successfully",
            id: newResolver.id,
            name: newResolver.name,
            email: newResolver.email,
            phoneNumber: newResolver.phoneNumber,
            location: newResolver.resolver?.location.locationName,
            occupationId: newResolver.resolver?.occupation.id,
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

        if (!newDesignations) {
            throw new Error("Could not set designations.");
        }

        res.status(201).json({
            ok: true,
            message: "Designations are set successfully",
            newDesignations
        });

    } catch (err) {
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

        if (!allDesignations) {
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

    } catch (err) {
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
                                id: true,
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
                designationTagId: incharge.issueIncharge.designation.id,
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
                                id: true,
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
                designationTagId: incharge.issueIncharge.designation.id,
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

export const getInchargeById = async (req: any, res: any) => {
    try {
        const inchargeId = req.params.id;

        if (!inchargeId) {
            throw new Error("Invalid incharge id.");
        }

        const incharge = await prisma.user.findFirst({
            where: {
                id: inchargeId
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
                },
                createdAt: true
            }
        });

        // todo: how many complaints has been assigned to this incharge
        if (!incharge) {
            throw new Error("Could not fetch incharge details. Please try again.");
        }

        const inchargeDetails = {
            id: incharge.id,
            name: incharge.name,
            email: incharge.email,
            phoneNumber: incharge.phoneNumber,
            location: incharge.issueIncharge?.location.locationName,
            designationTagId: incharge.issueIncharge?.designation.id,
            designation: incharge.issueIncharge?.designation.designation.designationName,
            rank: incharge.issueIncharge?.designation.rank,
            createdAt: incharge.createdAt,
        }

        res.status(200).json({
            ok: true,
            inchargeDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching incharge details. Please try again."
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
            where: { id: tagId },
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

        if (!tagDetails) {
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

    } catch (err) {
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

        if (!allOccupations) {
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

    } catch (err) {
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
                occupationId: r.resolver.occupation.id,
                occupation: r.resolver.occupation.occupationName,
                tags: r.resolver.occupation.occupationTag.map((o: any) => o.tag.tagName),
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
                        }
                    }
                }
            }
        });

        if (!resolversAtParticularLocation) {
            throw new Error("Could not find resolvers at the given location");
        }

        const resolversDetails = resolversAtParticularLocation.map((r: any) => {
            return {
                id: r.id,
                name: r.name,
                email: r.email,
                phoneNumber: r.phoneNumber,
                location: r.resolver.location.locationName,
                occupationId: r.resolver.occupation.id,
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

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the resolvers details at a particular location."
        });
    }
}

export const getResolverById = async (req: any, res: any) => {
    try {
        const resolverId = req.params.id;

        const resolver = await prisma.user.findUnique({
            where: { id: resolverId },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                resolver: {
                    select: {
                        occupation: {
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
                        },
                        location: {
                            select: {
                                locationName: true,
                            }
                        }
                    }
                }
            }
        });

        if (!resolver) {
            throw new Error("Could not fetch resolver details. Please try again.");
        }

        const resolverDetails = {
            id: resolver.id,
            name: resolver.name,
            email: resolver.email,
            phoneNumber: resolver.phoneNumber,
            location: resolver.resolver?.location.locationName,
            occupationId: resolver.resolver?.occupation.id,
            occupation: resolver.resolver?.occupation.occupationName,
            tags: resolver.resolver?.occupation.occupationTag.map((o: any) => o.tag.tagName),
            createdAt: resolver.createdAt,
        }

        res.status(200).json({
            ok: true,
            resolverDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching resolver details. Please try again."
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

        if (!rankDetails) {
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

        if (!designationDetails) {
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

    } catch (err) {
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

        if (!locationDetails) {
            throw new Error("Could not set location.");
        }

        res.status(201).json({
            ok: true,
            message: "Location is set successfully",
            locationId: locationDetails.id,
            location: locationDetails.locationName,
            tag: locationDetails.tag.tagName
        });

    } catch (err) {
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

        if (!newOccupations) {
            throw new Error("Could not set occupation details");
        }

        const setOccupationDetails = {
            occupationId: newOccupations[0].occupationId,
            occupation: newOccupations[0].occupation.occupationName,
            tags: newOccupations.map((o: any) => o.tag.tagName)
        }

        res.status(201).json({
            ok: true,
            message: "Occupation details is set successfully.",
            setOccupationDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while setting up the occupations."
        });
    }
}

export const updateInchargeDetails = async (req: any, res: any) => {
    try {
        const inchargeId = req.params.id;
        const body = req.body; // { name: string, email: string, phoneNumber: string, locationId: number, designationTagId: number, rank: number }
        const parseData = UpdateInchargeSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        // first check the given inchargeId is valid
        const incharge = await prisma.user.findUnique({
            where: {
                id: inchargeId
            },
            select: {
                role: true,
            }
        });

        if (!incharge) {
            throw new Error("Incharge not found.");
        }

        if (incharge.role !== "ISSUE_INCHARGE") {
            throw new Error("Invalid role");
        }

        const updatedIncharge = await prisma.user.update({
            where: {
                id: inchargeId
            },
            data: {
                name: parseData.data.name,
                email: parseData.data.email,
                phoneNumber: parseData.data.phoneNumber,
                issueIncharge: {
                    update: {
                        location: {
                            connect: {
                                id: parseData.data.locationId
                            }
                        },
                        designation: {
                            connect: {
                                id: parseData.data.designationTagId,
                                rank: parseData.data.rank,
                            }
                        }
                    }
                },
                updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString()
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
                },
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!updatedIncharge) {
            throw new Error("Could not update incharge details.");
        }

        const updatedInchargeDetails = {
            id: updatedIncharge.id,
            name: updatedIncharge.name,
            email: updatedIncharge.email,
            phoneNumber: updatedIncharge.phoneNumber,
            location: updatedIncharge.issueIncharge?.location.locationName,
            designationTagId: updatedIncharge.issueIncharge?.designation.id,
            designation: updatedIncharge.issueIncharge?.designation.designation.designationName,
            rank: updatedIncharge.issueIncharge?.designation.rank,
            createdAt: updatedIncharge.createdAt,
            updatedAt: updatedIncharge.updatedAt
        }

        res.status(200).json({
            ok: true,
            message: "Incharge details updated successfully.",
            inchargeDetails: updatedInchargeDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while updating incharge details."
        });
    }
}

export const updateResolverDetails = async (req: any, res: any) => {
    try {
        const resolverId = req.params.id;
        const body = req.body; // { name: string, email: string, phoneNumber: string, locationId: number, occupationId: number }
        const parseData = UpdateResolverSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        // first check the given resolverId is valid
        const resolver = await prisma.user.findUnique({
            where: {
                id: resolverId,
            },
            select: {
                role: true,
            }
        });

        if (!resolver) {
            throw new Error("Resolver not found. Update operation failed");
        }

        if (resolver.role !== "RESOLVER") {
            throw new Error("Invalid role");
        }

        const updatedResolver = await prisma.user.update({
            where: {
                id: resolverId
            },
            data: {
                name: parseData.data.name,
                email: parseData.data.email,
                phoneNumber: parseData.data.phoneNumber,
                resolver: {
                    update: {
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
                },
                updatedAt: new Date(Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000)).toISOString(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                updatedAt: true,
                resolver: {
                    select: {
                        occupation: {
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
                        },
                        location: {
                            select: {
                                locationName: true,
                            }
                        }
                    }
                }
            }
        });

        if (!updatedResolver) {
            throw new Error("Could not update resolver details.");
        }

        const updatedResolverDetails = {
            id: updatedResolver.id,
            name: updatedResolver.name,
            email: updatedResolver.email,
            phoneNumber: updatedResolver.phoneNumber,
            location: updatedResolver.resolver?.location.locationName,
            occupationId: updatedResolver.resolver?.occupation.id,
            occupation: updatedResolver.resolver?.occupation.occupationName,
            tags: updatedResolver.resolver?.occupation.occupationTag.map((o: any) => o.tag.tagName),
            createdAt: updatedResolver.createdAt,
            updatedAt: updatedResolver.updatedAt
        }

        res.status(200).json({
            ok: true,
            message: "Resolver details updated successfully.",
            resolverDetails: updatedResolverDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while updating resolver details."
        });
    }
}

export const removeLocations = async (req: any, res: any) => {
    try {
        const body = req.body; // { locations: Array<Int> }
        const parseData = RemoveLocationSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        const removedLocations = await prisma.location.deleteMany({
            where: {
                id: {
                    in: parseData.data.locations
                }
            }
        });

        if (!removeLocations) {
            throw new Error("Could not remove some locations while some locations might be deleted.");
        }

        res.status(200).json({
            ok: true,
            message: "Locations removed successfully.",
            removedLocations
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while removing locations."
        });
    }
}

export const removeTags = async (req: any, res: any) => {
    try {
        const body = req.body; // { tags: Array<Int> }
        const parseData = RemoveTagSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        const removedTags = await prisma.tag.deleteMany({
            where: {
                id: {
                    in: parseData.data.tags
                }
            }
        });

        if (!removedTags) {
            throw new Error("Could not remove some tags while some tags might be deleted.");
        }

        res.status(200).json({
            ok: true,
            message: "Tags removed successfully.",
            removedTags
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while removing tags."
        })
    }
}