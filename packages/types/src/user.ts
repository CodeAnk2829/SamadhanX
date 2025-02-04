import { z } from "zod";

enum Role {
    ADMIN = "ADMIN",
    FACULTY = "FACULTY",
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
    STUDENT = "STUDENT",
}

export const SignupSchema = z.object({
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(10),
    password: z.string().min(6),
    name: z.string().min(3),
    role: z.nativeEnum(Role),
});

export const SigninSchema = z.object({
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(10).optional(),
    password: z.string(),
    role: z.nativeEnum(Role)
});

export const UpdateSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    phoneNumber: z.string().min(10).max(10),
});

export const PasswordSchema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
});