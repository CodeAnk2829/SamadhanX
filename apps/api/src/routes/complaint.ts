import Router from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { createComplaint, createComplaintOutbox, deletedComplaintById, getAllComplaints, getComplaintById, getUsersComplaints, updateComplaintById, upvoteComplaint } from "../controllers/complaintController";

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
router.get("/get/complaintOutbox", createComplaintOutbox);

// update a complaint
router.patch("/update/:id", authMiddleware, authorizeMiddleware(Role), updateComplaintById);

// DELETE
router.delete("/delete/:id", authMiddleware, authorizeMiddleware(Role), deletedComplaintById);

export const complaintRouter = router;