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
    designationTagId: z.number(),
});

export const RemoveSchema = z.object({
    userId: z.string()
});

export const RemoveLocationSchema = z.object({
    locations: z.array(z.number())
});

export const RemoveTagSchema = z.object({
    tags: z.array(z.number())
})

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
    name: z.string().min(3),
    email: z.string().email(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/),
    phoneNumber: z.string().min(10).max(10),
    designationTagId: z.number(),
    locationId: z.number(),
    rank: z.number(),
});

export const UpdateResolverSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    // phoneNumber: z.string().regex(/^[6-9]\d{9}$/),
    phoneNumber: z.string().min(10).max(10),
    locationId: z.number(),
    occupationId: z.number(),
});