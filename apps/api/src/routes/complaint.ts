import Router from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { createComplaint, createComplaintOutbox, deletedComplaintById, getAllComplaints, getComplaintById, getUsersComplaints, upvoteComplaint } from "../controllers/complaintController";
import { CreateComplaintSchema } from "@repo/types/complaintTypes";
import { prisma } from "@repo/db/client";

const router = Router();

enum Role {
    FACULTY = "FACULTY",
    STUDENT = "STUDENT",
}


// CREATE
router.post("/create", authMiddleware, authorizeMiddleware(Role), createComplaint); // create a complaint
router.post("/upvote/:id", authMiddleware, authorizeMiddleware(Role), upvoteComplaint); // upvote a complaint

// READ
router.get("/get/all-complaints", authMiddleware, authorizeMiddleware(Role), getAllComplaints); // get all complaints
router.get("/get/complaint/:id", authMiddleware, authorizeMiddleware(Role), getComplaintById); // get a complaint by id
router.get("/get/user-complaints", authMiddleware, authorizeMiddleware(Role), getUsersComplaints); // get an user's complaints

router.get("/", createComplaintOutbox);
// update a complaint
// router.put("/update/:id", authMiddleware, authorizeMiddleware(Role), async (req: any, res: any) => {
//     try {
//         const body = req.body; // { title: string, description: string, access: string, postAsAnonymous: boolean, locationId: Int, tags: Array<Int>, attachments: Array<String> }
//         const parseData = CreateComplaintSchema.safeParse(body);
//         const complaintId = req.params.id;
//         const currentUserId = req.user.id;

//         if (!parseData.success) {
//             throw new Error("Invalid Inputs");
//         }

//         const doesComplaintBelongToLoggedInUser = await prisma.complaint.findUnique({
//             where: { id: complaintId },
//             select: {
//                 userId: true,
//                 status: true,
//                 complaintAssignment: {
//                     select: {
//                         user: {
//                             select: {
//                                 issueIncharge: {
//                                     select: {
//                                         locationId: true
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });
        
//         if(!doesComplaintBelongToLoggedInUser) {
//             throw new Error("No complaint exist with this given id");
//         }
        
//         // if status is pending then don't let an user to update the complaint details
//         if(doesComplaintBelongToLoggedInUser.status !== "PENDING" && doesComplaintBelongToLoggedInUser.status !== "ASSIGNED") {
//             throw new Error("Complaint is already picked up. You cannot update the complaint details");
//         }

//         // check whether the complaintId belongs to the current user
//         if(doesComplaintBelongToLoggedInUser.userId !== currentUserId) {
//             throw new Error("Access Denied. You do not have permissions to make changes for this complaint.");
//         }
        
//         const currentLocationId = doesComplaintBelongToLoggedInUser.complaintAssignment?.user?.issueIncharge?.locationId;

//         let tagData: any[] = [];
//         let attachmentsData: any[] = [];
        
//         parseData.data.tags.forEach(id => {
//             tagData.push({ tagId: Number(id) });
//         });

//         parseData.data.attachments.forEach(url => {
//             attachmentsData.push({ imageUrl: url });
//         });
        
//         let dataToUpdate: any = {
//             title: parseData.data.title,
//             description: parseData.data.description,
//             access: parseData.data.access,
//             postAsAnonymous: parseData.data.postAsAnonymous,
//             tags: {
//                 deleteMany: [{ complaintId }], // delete existing tags 
//                 create: tagData // then create new tags which is given by the user
//             },
//             attachments: {
//                 deleteMany: [{ complaintId }], // same as tags
//                 create: attachmentsData
//             },
//         }

//         // check whether location is same or not, if not then update the location also
//         if(currentLocationId !== parseData.data.locationId) {
            
//             // find the least ranked incharge of the hostel of the given location
//             const issueIncharge = await prisma.issueIncharge.findFirst({
//                 where: {
//                     location: { location, locationName, locationBlock }
//                 },
//                 orderBy: {
//                     rank: "desc"
//                 },
//                 select: {
//                     inchargeId: true,
//                     locationId: true
//                 }
//             });

//             if (!issueIncharge) {
//                 throw new Error("No incharge found for the given location");
//             }

//             dataToUpdate = { 
//                 ...dataToUpdate,
//                 complaintDetails: {
//                     update: {
//                         pickedBy: issueIncharge.inchargeId,
//                     }
//                 },
//             }
//         }

//         const updateComplaint = await prisma.complaint.update({
//             where: { id: complaintId },
//             data: dataToUpdate,
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
//                         id: true,
//                         name: true,
//                     }
//                 },
//                 complaintDetails: {
//                     select: {
//                         upvotes: true,
//                         actionTaken: true,
//                         incharge: {
//                             select: {
//                                 id: true,
//                                 name: true,
//                                 email: true,
//                                 issueIncharge: {
//                                     select: {
//                                         designation: true,
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         if (!updateComplaint) {
//             throw new Error("Could not create complaint. Please try again");
//         }

//         // check whether this user has upvoted this complaint
//         let hasUpvoted: boolean = false;

//         const upvote = await prisma.upvote.findFirst({
//             where: { userId: currentUserId, complaintId},
//             select: { id: true }
//         });

//         if(upvote) {
//             hasUpvoted = true;
//         }

//         const tagNames = updateComplaint.tags.map(tag => tag.tags.tagName);
//         const attachments = updateComplaint.attachments.map(attachment => attachment.imageUrl);

//         let complaintResponse = updateComplaint;

//         if (updateComplaint.postAsAnonymous) {
//             complaintResponse = {
//                 ...updateComplaint,
//                 user: {
//                     id: updateComplaint.user.id,
//                     name: "Anonymous",
//                 }
//             }
//         }

//         res.status(200).json({
//             ok: true,
//             message: "Complaint updated successfully",
//             complaintId: complaintResponse.id,
//             title: complaintResponse.title,
//             description: complaintResponse.description,
//             access: complaintResponse.access,
//             postAsAnonymous: complaintResponse.postAsAnonymous,
//             userName: complaintResponse.user.name,
//             userId: complaintResponse.user.id,
//             hasUpvoted,
//             status: complaintResponse.status,
//             inchargeId: complaintResponse.complaintDetails?.incharge.id,
//             inchargeName: complaintResponse.complaintDetails?.incharge.name,
//             inchargeDesignation: complaintResponse.complaintDetails?.incharge.issueIncharge?.designation,
//             location: parseData.data.location,
//             upvotes: complaintResponse.complaintDetails?.upvotes,
//             actionTaken: complaintResponse.complaintDetails?.actionTaken,
//             attachments: attachments,
//             tags: tagNames,
//             createdAt: complaintResponse.createdAt
//         });
//     } catch (err) {
//         res.status(400).json({
//             ok: false,
//             error: err instanceof Error ? err.message : "An error occurred while updating the complaint"
//         });
//     }
// });

// DELETE
// TODO: check whether the complaintID belong to the logged in user
router.delete("/delete/:id", authMiddleware, authorizeMiddleware(Role), deletedComplaintById); // delete a complaint

export const complaintRouter = router;