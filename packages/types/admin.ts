import { z } from "zod";

enum Role {
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
    RESOLVER = "RESOLVER",
}

export const InchargeSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/),
    phoneNumber: z.string().min(10).max(10),
    role: z.nativeEnum(Role),
    locationId: z.number(),
    designationId: z.number(),
});

export const RemoveSchema = z.object({
    userId: z.string()
});

export const ResolverSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/),
    phoneNumber: z.string().min(10).max(10),
    role: z.nativeEnum(Role),
    locationId: z.number(),
    occupationId: z.number(),
});

export const UpdateInchargeSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/).optional(),
    phoneNumber: z.string().min(10).max(10),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(Role).optional(),
    location: z.string().optional(),
    designation: z.string().min(3).optional(),
    rank: z.number().optional(),
});

export const UpdateResolverSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/).optional(),
    phoneNumber: z.string().min(10).max(10),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(Role).optional(),
    location: z.string().min(3).optional(),
    occupation: z.string().min(3).optional(),
});