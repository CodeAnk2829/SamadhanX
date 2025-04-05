import { Router } from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { changePassword, deleteUser, getUpvotedComplaints, getUserNotification, getUserProfile, signin, signout, signup, updateUserDetails } from "../controllers/userController";

const router = Router();

const secret: string | undefined = process.env.JWT_SECRET;

enum Role {
    FACULTY = "FACULTY",
    STUDENT = "STUDENT",
}

// CREATE
router.post("/auth/signin", signin);
router.post("/auth/signup", signup);
router.post("/auth/signout", authMiddleware, signout);

// READ
router.get("/me/profile", authMiddleware, authorizeMiddleware(Role), getUserProfile);
router.get("/me/upvoted", authMiddleware, authorizeMiddleware(Role), getUpvotedComplaints); // get all complaints the logged in user has upvoted for
router.get("/me/notifications", authMiddleware, authorizeMiddleware(Role), getUserNotification);

// UPDATE
router.patch("/me/update", authMiddleware, authorizeMiddleware(Role), updateUserDetails);
router.patch("/me/change-password", authMiddleware, authorizeMiddleware(Role), changePassword);

// DELETE
router.delete("/me/delete", authMiddleware, authorizeMiddleware(Role), deleteUser);

export const userRouter = router;