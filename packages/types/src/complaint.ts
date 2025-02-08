import { z } from "zod";

enum Access {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE",
}

export const CreateComplaintSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(3),
    access: z.nativeEnum(Access),
    postAsAnonymous: z.boolean(),
    locationId: z.number(),
    tags: z.array(z.number()),
    attachments: z.array(z.string())
});

export const UpdateComplaintSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(3),
    access: z.nativeEnum(Access),
    postAsAnonymous: z.boolean(),
    tags: z.array(z.number()),
    attachments: z.array(z.string())
});