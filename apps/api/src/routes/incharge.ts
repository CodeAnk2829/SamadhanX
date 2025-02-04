import { Router } from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { escalateComplaint, getAllComplaintsAssignedToIncharge } from "../controllers/inchargeController";
import { getComplaintById } from "../controllers/complaintController";

const router = Router();

enum Role {
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
}

router.post("/escalate", authMiddleware, authorizeMiddleware(Role), escalateComplaint);

router.get("/get/all-complaints", authMiddleware, authorizeMiddleware(Role), getAllComplaintsAssignedToIncharge)
router.get("/get/complaint/:id", authMiddleware, authorizeMiddleware(Role), getComplaintById);

export const inchargeRouter = router;