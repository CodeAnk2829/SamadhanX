import { Router } from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { delegateComplaint, escalateComplaint, getActiveComplaintsAssignedToIncharge, getAllComplaintsForWhichActionHasTaken, markComplaintAsResolved } from "../controllers/inchargeController";
import { getComplaintById } from "../controllers/complaintController";
import { getResolvers, getResolversAtALocation } from "../controllers/adminController";

const router = Router();

enum Role {
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
}


// CREATE

// READ
router.get("/get/active-complaints", authMiddleware, authorizeMiddleware(Role), getActiveComplaintsAssignedToIncharge);
router.get("/get/action-taken-complaints", authMiddleware, authorizeMiddleware(Role), getAllComplaintsForWhichActionHasTaken);
router.get("/get/complaint/:id", authMiddleware, authorizeMiddleware(Role), getComplaintById);
router.get("/get/resolvers", authMiddleware, authorizeMiddleware(Role), getResolvers);
router.get("/get/resolvers-at-location/:locationId", authMiddleware, authorizeMiddleware(Role), getResolversAtALocation);

// UPDATE
router.patch("/delegate", authMiddleware, authorizeMiddleware(Role), delegateComplaint);
router.patch("/escalate", authMiddleware, authorizeMiddleware(Role), escalateComplaint);
router.patch("/mark/resolved", authMiddleware, authorizeMiddleware(Role), markComplaintAsResolved);


export const inchargeRouter = router;