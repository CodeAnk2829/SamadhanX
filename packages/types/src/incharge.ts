import { z } from "zod";

enum Role {
    ISSUE_INCHARGE = "ISSUE_INCHARGE",
}

export const DelegateSchema = z.object({
    complaintId: z.string(),
    resolverId: z.string(),
});