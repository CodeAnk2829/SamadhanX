import Router from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { closeComplaint, createComplaint, deletedComplaintById, getAllComplaints, getComplaintById, getComplaintHistory, getFilteredComplaints, getUsersComplaints, recreateComplaint, updateComplaintById, upvoteComplaint } from "../controllers/complaintController";

const router = Router();

enum Role {
    FACULTY = "FACULTY",
    STUDENT = "STUDENT",
    ADMIN = "ADMIN",
}

enum ExceptionalRole {
    FACULTY = "FACULTY",
    STUDENT = "STUDENT",
    ADMIN = "ADMIN",
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
}

// CREATE
router.post("/create", authMiddleware, authorizeMiddleware(Role), createComplaint); // create a complaint
router.post("/upvote/:id", authMiddleware, authorizeMiddleware(Role), upvoteComplaint); // upvote a complaint
router.post("/close", authMiddleware, authorizeMiddleware(Role), closeComplaint); // close a complaint
router.post("/recreate/:id", authMiddleware, authorizeMiddleware(Role), recreateComplaint); // recreate a complaint by id
router.post("/get/filtered-complaints", authMiddleware, authorizeMiddleware(ExceptionalRole), getFilteredComplaints); // get all complaints by location id

// READ
router.get("/get/all-complaints", authMiddleware, authorizeMiddleware(Role), getAllComplaints); // get all complaints
router.get("/get/complaint/:id", authMiddleware, authorizeMiddleware(ExceptionalRole), getComplaintById); // get a complaint by id
router.get("/get/user-complaints", authMiddleware, authorizeMiddleware(Role), getUsersComplaints); // get an user's complaints
router.get("/get/complaint-history/:id", authMiddleware, authorizeMiddleware(Role), getComplaintHistory); // get complaint history by complaint id

// UPDATE
router.patch("/update/:id", authMiddleware, authorizeMiddleware(Role), updateComplaintById);

// DELETE
router.delete("/delete/:id", authMiddleware, authorizeMiddleware(Role), deletedComplaintById);

export const complaintRouter = router;