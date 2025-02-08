import { Router } from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { assignIncharge, assignResolver, createDesignations, createOccupations, createTags, getDesignations, getIncharges, getInchargesAtALocation, getLocations, getLocationsDesignationsAndOccupationsBasedOnTag, getOccupations, getResolvers, getResolversAtALocation, getTags, getUsers, setDesignation, setLocation, setOccupations } from "../controllers/adminController";


const router = Router();

enum Role {
    ADMIN = "ADMIN"
}

// CREATE
router.post("/assign/incharge", authMiddleware, authorizeMiddleware(Role), assignIncharge);
router.post("/assign/resolver", authMiddleware, authorizeMiddleware(Role), assignResolver);
router.post("/create/designations", authMiddleware, authorizeMiddleware(Role), createDesignations);
router.post("/create/occupations", authMiddleware, authorizeMiddleware(Role), createOccupations);
router.post("/create/tags", authMiddleware, authorizeMiddleware(Role), createTags);
router.post("/set/designation", authMiddleware, authorizeMiddleware(Role), setDesignation);
router.post("/set/location", authMiddleware, authorizeMiddleware(Role), setLocation);
router.post("/set/occupations", authMiddleware, authorizeMiddleware(Role), setOccupations);

// READ
router.get("/get/designations", authMiddleware, authorizeMiddleware(Role), getDesignations);
router.get("/get/incharges", authMiddleware, authorizeMiddleware(Role), getIncharges);
router.get("/get/incharges-at-location/:locationId", authMiddleware, authorizeMiddleware(Role), getInchargesAtALocation);
router.get("/get/locations", authMiddleware, getLocations);
router.get("/get/occupations", authMiddleware, authorizeMiddleware(Role), getOccupations);
router.get("/get/resolvers", authMiddleware, authorizeMiddleware(Role), getResolvers);
router.get("/get/resolvers-at-location/:locationId", authMiddleware, authorizeMiddleware(Role), getResolversAtALocation);
router.get("/get/tags", authMiddleware, getTags);
router.get("/get/tag-details/:tagId", authMiddleware, authorizeMiddleware(Role), getLocationsDesignationsAndOccupationsBasedOnTag);
router.get("/get/users", authMiddleware, authorizeMiddleware(Role), getUsers);

// router.get("/get/incharge/:id", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const inchargeId = req.params.id;

//         if (!inchargeId) {
//             throw new Error("Invalid incharge id.");
//         }

//         const inchargeDetails = await prisma.user.findFirst({
//             where: {
//                 id: inchargeId
//             },
//             select: {
//                 id: true,
//                 name: true,
//                 email: true,
//                 phoneNumber: true,
//                 issueIncharge: {
//                     select: {
//                         location: {
//                             select: {
//                                 location: true,
//                                 locationName: true,
//                                 locationBlock: true
//                             }
//                         },
//                         designation: true,
//                         rank: true
//                     }
//                 },
//                 createdAt: true
//             }
//         });

//         // todo: how many complaints has been assigned to this incharge
//         if (!inchargeDetails) {
//             throw new Error("Could not fetch incharge details. Please try again.");
//         }

//         res.status(200).json({
//             ok: true,
//             inchargeId: inchargeDetails.id,
//             name: inchargeDetails.name,
//             email: inchargeDetails.email,
//             phoneNumber: inchargeDetails.phoneNumber,
//             location: `${inchargeDetails.issueIncharge?.location.location}-${inchargeDetails.issueIncharge?.location.locationName}-${inchargeDetails.issueIncharge?.location.locationBlock}`,
//             designation: inchargeDetails.issueIncharge?.designation,
//             rank: inchargeDetails.issueIncharge?.rank,
//             createdAt: inchargeDetails.createdAt
//         });

//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while fetching incharge details. Please try again."
//         });
//     }
// });

// // admin can view list of all incharges who are working at a particular location

// // router.get("/get/resolver/:id", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
// //     try {
// //         const resolverId = req.params.id;
// //         const resolver = await prisma.user.findUnique({
// //             where: { id: resolverId },
// //             select: {
// //                 id: true,
// //                 name: true, 
// //                 email: true,
// //                 phoneNumber: true,
// //                 role: true,
// //                 createdAt: true,
// //                 resolversComplaint: {
// //                     select: {
// //                         complaintId: true,
// //                         pickedBy: true,
// //                         actionTaken: true,
// //                         resolvedAt: true
// //                     }
// //                 },
// //                 resolver: {
// //                     select: {
// //                         occupation: true,
// //                         location: true
// //                     }
// //                 }
// //             }
// //         });

// //         if(!resolver) {
// //             throw new Error("Could not fetch resolver details. Please try again.");
// //         }   

// //         res.status(200).json({
// //             ok: true,
// //             resolverId: resolver.id,
// //             resolverName: resolver.name,
// //             email: resolver.email,
// //             phoneNumber: resolver.phoneNumber,
// //             role: resolver.role,
// //             createdAt: resolver.createdAt,
// //             occupation: resolver.resolver?.occupation,
// //             location: `${resolver.resolver?.location.location}-${resolver.resolver?.location.locationName}-${resolver.resolver?.location.locationBlock}`,
// //             complaints: resolver.resolversComplaint
// //         });

// //     } catch (err) {
// //         res.status(400).json({
// //             ok: false,
// //             error: err instanceof Error ? err.message : "An error occurred while fetching resolver details. Please try again."
// //         });
// //     }
// // });


// router.patch("/update/incharge/:id", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const inchargeId = req.params.id;
//         const updateData = req.body; // { name: string, email: string, phoneNumber: string, password: string, location: string, designation: string, rank: number? }
//         const parseData = UpdateInchargeSchema.safeParse(updateData);

//         if (!parseData.success) {
//             throw new Error("Invalid inputs");
//         }

//         let cleanedData: any = Object.fromEntries(
//             Object.entries(updateData).filter(([_, value]) => value != null)
//         );

//         if ('password' in cleanedData) {
//             const plainPassword: any = cleanedData.password;
//             const password = bcrypt.hashSync(plainPassword, 10);
//             cleanedData.password = password;
//         }

//         if ('location' in cleanedData) {
//             const location = parseData.data.location?.split("-")[0];
//             const locationName = parseData.data.location?.split("-")[1];
//             const locationBlock = parseData.data.location?.split("-")[2];

//             const currentLocation = await prisma.location.findFirst({
//                 where: { location, locationName, locationBlock },
//                 select: { id: true }
//             });

//             if (!currentLocation) {
//                 throw new Error("Could not find the given location.");
//             }

//             cleanedData = {
//                 ...cleanedData,
//                 issueIncharge: {
//                     update: {
//                         locationId: currentLocation.id,
//                     }
//                 }
//             };

//             delete cleanedData.location;

//             if ('designation' in cleanedData) {
//                 cleanedData.issueIncharge.update.designation = parseData.data.designation;
//                 delete cleanedData.designation;
//             }
//             if('rank' in cleanedData) {
//                 cleanedData.issueIncharge.update.rank = parseData.data.rank;
//                 delete cleanedData.rank;
//             }
//         } else if ('designation' in cleanedData) {
//             cleanedData = {
//                 ...cleanedData,
//                 issueIncharge: {
//                     update: {
//                         designation: cleanedData.designation,
//                     }
//                 }
//             };
//             delete cleanedData.designation;
//             if ('rank' in cleanedData) {
//                 cleanedData.issueIncharge.update.rank = parseData.data.rank;
//                 delete cleanedData.rank;
//             }
//         } else if ('rank' in cleanedData) {
//             cleanedData = {
//                 ...cleanedData, 
//                 issueIncharge: {
//                     update: {
//                         rank: cleanedData.rank
//                     }
//                 }
//             }
//             delete cleanedData.rank;
//         }

//         const isUpdateSucceeded = await prisma.user.update({
//             where: {
//                 id: inchargeId
//             },
//             data: cleanedData,
//             select: {
//                 id: true,
//                 name: true,
//                 email: true,
//                 phoneNumber: true,
//                 role: true,
//                 createdAt: true,
//                 issueIncharge: {
//                     select: {
//                         location: true,
//                         designation: true,
//                         rank: true,
//                     }
//                 }
//             }
//         });

//         if(!isUpdateSucceeded) {
//             throw new Error("Could not update incharge details. Please try again.");
//         }

//         const currentLocation = isUpdateSucceeded.issueIncharge?.location;

//         res.status(200).json({
//             ok: true,
//             message: "Incharge details updated successfully",
//             name: isUpdateSucceeded.name,
//             email: isUpdateSucceeded.email,
//             phoneNumber: isUpdateSucceeded.phoneNumber,
//             role: isUpdateSucceeded.role,
//             location: `${currentLocation?.location}-${currentLocation?.locationName}-${currentLocation?.locationBlock}`,
//             designation: isUpdateSucceeded.issueIncharge?.designation,
//             rank: isUpdateSucceeded.issueIncharge?.rank,
//         });

//     } catch(err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while updating incharge details. Please try again."
//         });
//     }
// });

// router.patch("/update/resolver/:id", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const resolverId = req.params.id;
//         const updateData = req.body; // { name: string, email: string, phoneNumber: string, password: string, location: string, role: string, occupation: string }
//         const parseData = UpdateResolverSchema.safeParse(updateData);

//         if(!parseData.success) {
//             throw new Error("Invalid inputs");
//         }

//         let cleanedData: any = Object.fromEntries(
//             Object.entries(updateData).filter(([_, value]) => value != null)
//         );

//         if('password' in cleanedData) {
//             const plainPassword: any = cleanedData.password;
//             const password = bcrypt.hashSync(plainPassword, 10);
//             cleanedData.password = password;
//         }

//         if('location' in cleanedData) {
//             const location = parseData.data.location?.split("-")[0];
//             const locationName = parseData.data.location?.split("-")[1];
//             const locationBlock = parseData.data.location?.split("-")[2];

//             const currentLocation = await prisma.location.findFirst({
//                 where: { location, locationName, locationBlock },
//                 select: { id: true }
//             });

//             if (!currentLocation) {
//                 throw new Error("Could not find the given location.");
//             }

//             cleanedData = { 
//                 ...cleanedData,
//                 resolver: {
//                     update: { 
//                         locationId: currentLocation.id,
//                     } 
//                 } 
//             };

//             delete cleanedData.location;

//             if('occupation' in cleanedData) {
//                 cleanedData.resolver.update.occupation = parseData.data.occupation;
//                 delete cleanedData.occupation;
//             } 
//         } else if('occupation' in cleanedData) {
//             cleanedData = { 
//                 ...cleanedData,
//                 resolver: {
//                     update: { 
//                         occupation: parseData.data.occupation,
//                     } 
//                 } 
//             };
//             delete cleanedData.occupation;
//         }

//         console.log(cleanedData);
//         const isUpdateSucceeded = await prisma.user.update({
//             where: {
//                 id: resolverId
//             },
//             data: cleanedData,
//             select: {
//                 name: true,
//                 email: true,
//                 phoneNumber: true,
//                 role: true,
//                 resolver: {
//                     select: {
//                         occupation: true,
//                         location: {
//                             select: {
//                                 location: true,
//                                 locationName: true,
//                                 locationBlock: true
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         if (!isUpdateSucceeded) {
//             throw new Error("Could not update incharge details. Please try again.");
//         }

//         res.status(200).json({
//             ok: true,
//             message: "Resolver's details updated successfully",
//             name: isUpdateSucceeded.name,
//             email: isUpdateSucceeded.email,
//             phoneNumber: isUpdateSucceeded.phoneNumber,
//             role: isUpdateSucceeded.role,
//             location: `${isUpdateSucceeded.resolver?.location.location}-${isUpdateSucceeded.resolver?.location.locationName}-${isUpdateSucceeded.resolver?.location.locationBlock}`,
//             occupation: isUpdateSucceeded.resolver?.occupation,
//         });
//     } catch(err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while updating resolver details. Please try again."
//         });
//     }
// });

// router.patch("/update/user/password/:id", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const userId = req.params.id;
//         const updateData = req.body; // { password: string }
//         const password = bcrypt.hashSync(updateData.password, 10);

//         const isPasswordUpdated = await prisma.user.update({
//             where: { id: userId },
//             data: { password }
//         });

//         if (!isPasswordUpdated) {
//             throw new Error("Could not update password. Please try again.");
//         }

//         res.status(200).json({
//             ok: true,
//             message: "Password updated successfully"
//         });

//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while updating password. Please try again."
//         });
//     }
// });

// router.delete("/remove/locations", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const locations = req.body.locations; // { locations: Array<{ location: String, locationName: String, locationBlock: String }> }

//         if(locations.length === 0) {
//             throw new Error("Invalid inputs");
//         }

//         const locationsToBeRemoved: any[] = [];

//         locations.forEach((loc: any) => {
//             locationsToBeRemoved.push({
//                 location: loc.location,
//                 locationName: loc.locationName,
//                 locationBlock: loc.locationBlock
//             });
//         });

//         const isLocationsRemoved = await prisma.location.deleteMany({
//             where: {
//                 AND: [{
//                     location: {
//                         in: locationsToBeRemoved.map((loc) => loc.location)
//                     }
//                 }, {
//                     locationName: {
//                         in: locationsToBeRemoved.map((loc) => loc.locationName)
//                     }
//                 }, {
//                     locationBlock: {
//                         in: locationsToBeRemoved.map((loc) => loc.locationBlock)
//                     }
//                 }]
//             }
//         });

//         if(!isLocationsRemoved) {
//             throw new Error("Could not remove locations. Please try again.");
//         }

//         res.status(202).json({
//             ok: true,
//             message: "Locations removed successfully",
//         });

//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while removing locations. Please try again."
//         });
//     }
// });

// router.delete("/remove/tags", authMiddleware, authorizeMiddleware(Role), async (req, res) => {
//     try {
//         const tags = req.body.tags; // { tags: Array<String> }

//         if (tags.length === 0) {
//             throw new Error("Invalid inputs");
//         }

//         const isTagsRemoved = await prisma.tag.deleteMany({
//             where: {
//                 tagName: {
//                     in: tags
//                 }
//             }
//         });

//         if (!isTagsRemoved) {
//             throw new Error("Could not remove tags. Please try again.");
//         }

//         res.status(202).json({
//             ok: true,
//             message: "Tags removed successfully",
//         });

//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while removing tags. Please try again."
//         });
//     }
// });


// router.delete("/remove/user/:id", authMiddleware, authorizeMiddleware(Role), async (req: any, res: any) => {
//     try {
//         const id = req.params.id; // anyone except admin

//         // check whether the id is of admin's id
//         // restrict delete action on admin
//         const isAdmin = await prisma.user.findUnique({
//             where: { id },
//             select: { role: true }
//         });

//         if(!isAdmin) {
//             throw new Error("Could not find user i.e. invalid id");
//         }

//         if(isAdmin.role === "ADMIN") {
//             throw new Error("Restricted action.");
//         }

//         const isRemovalSucceeded = await prisma.user.delete({
//             where: { id }
//         });

//         if (!isRemovalSucceeded) {
//             throw new Error("Could not remove user. Please try again.");
//         }

//         res.status(202).json({
//             ok: true,
//             message: "The user has been successfully removed.",
//         });

//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while removing incharge. Please try again."
//         });
//     }
// });

export const adminRouter = router;