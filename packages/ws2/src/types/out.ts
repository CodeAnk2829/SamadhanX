type CreatedComplaint = {
    type: "CREATED",
    data: {
        complaintId: string
    }
}

type EscalateComplaint = {
    type: "ESCALATED",
    data: {
        complaintId: string
    }
}

type ResolveComplaint = {
    type: "RESOLVED",
    data: {
        complaintId: string
    }
}

type UpdatedComplaint = {
    type: "UPDATED",
    data: {
        complaintId: string
    }
}

export type OutgoingMessage = CreatedComplaint | EscalateComplaint | ResolveComplaint | UpdatedComplaint;