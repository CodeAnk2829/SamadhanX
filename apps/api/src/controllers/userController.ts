import { prisma } from "@repo/db/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PasswordSchema, SigninSchema, SignupSchema, UpdateSchema } from "@repo/types/userTypes";

const secret: string | undefined = process.env.JWT_SECRET;
const currentDateTime = Date.now() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000);

export const signin = async (req: any, res: any) => {
    try {
        const body = req.body; // { email: "" or phoneNumber: "", password: "", role: "" }
        const parseData = SigninSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        // check if user exists
        let user = null;

        if (parseData.data.email) {
            user = await prisma.user.findUnique({
                where: {
                    email: parseData.data.email,
                },
            });
        } else {
            user = await prisma.user.findFirst({
                where: {
                    phoneNumber: parseData.data.phoneNumber,
                },
            });
        }

        if (!user) {
            throw new Error("User not found");
        }

        // check if password is correct
        if (!bcrypt.compareSync(parseData.data.password, user.password)) {
            throw new Error("Incorrect Password");
        }

        // check if role is correct
        if (user.role !== parseData.data.role) {
            throw new Error("Authorization Error");
        }

        const userId = user.id;
        const role = user.role;

        const token = jwt.sign({ userId, role }, secret as string);

        // expires in 30 days
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(currentDateTime + 30 * 24 * 60 * 60 * 1000),
        });

        res.status(200).json({
            token: token,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.createdAt,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An unknown error occurred",
        });
    }
}

export const signup = async (req: any, res: any) => {
    try {
        const body = req.body; // { name: string, email: string, phoneNumber: string, password: string, role: string }
        const parseData = SignupSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        // check if user exists
        const isUserExisted = await prisma.user.findFirst({
            where: {
                email: parseData.data.email,
            },
        });

        if (isUserExisted) {
            throw new Error("User already exists");
        }

        const password = bcrypt.hashSync(parseData.data.password, 10);

        // store the user's information in the database
        const user = await prisma.user.create({
            data: {
                email: parseData.data.email,
                phoneNumber: parseData.data.phoneNumber,
                password: password,
                name: parseData.data.name,
                role: parseData.data.role as "ADMIN" | "FACULTY" | "STUDENT",
                createdAt: new Date(currentDateTime).toISOString(),
            },
        });

        if (!user) {
            throw new Error("User not created");
        }

        const userId = user.id;
        const role = parseData.data.role;

        const token = jwt.sign({ userId, role }, secret as string);

        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(currentDateTime + 30 * 24 * 60 * 60 * 1000),
        });
        res.status(201).json({
            token: token,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.createdAt,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An unknown error occurred",
        });
    }
}

export const signout = async (req: any, res: any) => {
    try {
        res.clearCookie("token");
        res.status(200).json({
            ok: true,
            message: "Successfully signed out",
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error:
                err instanceof Error
                    ? err.message
                    : "An error occurred while signing out.",
        });
    }
}

export const getUserProfile = async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        // get user's details
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        res.status(200).json({
            ok: true,
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            created_at: user.createdAt,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching user's details",
        });
    }
}

export const getUpvotedComplaints = async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const upvotedComplaints = await prisma.upvote.findMany({
            where: { userId },
            select: {
                complaint: {
                    // orderBy: { createdAt: "desc" },
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
                                email: true,
                                phoneNumber: true,
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
                                        email: true,
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
                                                        locationName: true,
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    },
                }
            }
        });

        const upvotedComplaintsDetails = upvotedComplaints.map((uc: any) => {
            return {
                complaintId: uc.complaint.id,
                title: uc.complaint.title,
                description: uc.complaint.description,
                access: uc.complaint.access,
                postAsAnonymous: uc.complaint.postAsAnonymous,
                status: uc.complaint.status,
                actionTaken: uc.complaint.actionTaken,
                upvotes: uc.complaint.totalUpvotes,
                complainerId: uc.complaint.userId,
                complainerName: uc.complaint.user.name,
                complainerEmail: uc.complaint.user.email,
                complainerPhone: uc.complaint.user.phoneNumber,
                attachments: uc.complaint.attachments,
                tags: uc.complaint.tags.map((t: any) => t.tags.tagName),
                inchargeId: uc.complaint.complaintAssignment.user.id,
                inchargeName: uc.complaint.complaintAssignment.user.name,
                inchargeEmail: uc.complaint.complaintAssignment.user.email,
                inchargePhone: uc.complaint.complaintAssignment.user.phoneNumber,
                designation: uc.complaint.complaintAssignment.user.issueIncharge.designation.designation.designationName,
                inchargeRank: uc.complaint.complaintAssignment.user.issueIncharge.designation.rank,
                location: uc.complaint.complaintAssignment.user.issueIncharge.location.locationName,
                assignedAt: uc.complaint.complaintAssignment.assignedAt,
                createdAt: uc.complaint.createdAt,
                expiredAt: uc.complaint.expiredAt,
            }
        });

        res.status(200).json({
            ok: true,
            upvotedComplaintsDetails
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while fetching the upvoted complaints by the logged in user."
        });
    }
}

export const updateUserDetails = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const body = req.body; // { name: string, email: string, phoneNumber: string }
        const parseData = UpdateSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid Inputs");
        }

        // update the user's details
        const userDetailsAfterUpdate = await prisma.user.update({
            where: { id: userId },
            data: {
                name: parseData.data.name,
                email: parseData.data.email,
                phoneNumber: parseData.data.phoneNumber
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
            }
        });

        if (!userDetailsAfterUpdate) {
            throw new Error("Could not update user's details.");
        }

        res.status(200).json({
            ok: true,
            message: "User details updated successfully.",
            id: userDetailsAfterUpdate.id,
            name: userDetailsAfterUpdate.name,
            email: userDetailsAfterUpdate.email,
            phoneNumber: userDetailsAfterUpdate.phoneNumber,
            role: userDetailsAfterUpdate.role,
        });

    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while updating the user's details."
        });
    }
}

export const changePassword = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const body = req.body; // { currentPassword: string, newPassword: string, confirmPassword: string }
        const parseData = PasswordSchema.safeParse(body);

        if (!parseData.success) {
            throw new Error("Invalid inputs");
        }

        if (parseData.data.newPassword !== parseData.data.confirmPassword) {
            throw new Error("New password and confirm password do not match.");
        }

        // get user's old password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user) {
            throw new Error("Could not find user.");
        }

        const oldPassword = bcrypt.compareSync(parseData.data.currentPassword, user.password);

        if (!oldPassword) {
            throw new Error("Current password is incorrect.");
        }

        // change the password
        const newPassword = bcrypt.hashSync(parseData.data.newPassword, 10);
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword },
            select: { id: true }
        });

        if (!updatedUser) {
            throw new Error("Could not update password.");
        }

        res.status(200).json({
            ok: true,
            message: "Password updated successfully.",
            userId: updatedUser.id
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while changing the password."
        });
    }
}

export const deleteUser = async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const deletedUser = await prisma.user.delete({
            where: { id: userId },
            select: { id: true }
        });

        if (!deletedUser) {
            throw new Error("Could not delete user account.");
        }

        res.clearCookie("token");

        res.status(200).json({
            ok: true,
            message: "User account deleted successfully.",
            id: deletedUser.id
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            error: err instanceof Error ? err.message : "An occurred while deleting user account."
        });
    }
}