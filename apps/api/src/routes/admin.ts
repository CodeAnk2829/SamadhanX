import { Router } from "express";
import { authMiddleware, authorizeMiddleware } from "../middleware/auth";
import { assignIncharge, assignResolver, createDesignations, createOccupations, createTags, getDesignations, getInchargeById, getIncharges, getInchargesAtALocation, getLocations, getLocationsDesignationsAndOccupationsBasedOnTag, getOccupations, getResolverById, getResolvers, getResolversAtALocation, getTags, getUsers, removeLocations, removeTags, setDesignation, setLocation, setOccupations, updateInchargeDetails, updateResolverDetails } from "../controllers/adminController";


const router = Router();

enum Role {
    ADMIN = "ADMIN"
}

// CREATE
router.post("/assign/incharge", authMiddleware, authorizeMiddleware(Role), assignIncharge);
router.post("/assign/resolver", authMiddleware, authorizeMiddleware(Role), assignResolver);
router.post("/create/designations", authMiddleware, authorizeMiddleware(Role), createDesignations);
router.post("/create/occupations", authMiddleware, authorizeMiddleware(Role), createOccupations);
router.post("/create/tags", authMiddleware, authorizeMiddleware(Role), createTags);
router.post("/set/designation", authMiddleware, authorizeMiddleware(Role), setDesignation);
router.post("/set/location", authMiddleware, authorizeMiddleware(Role), setLocation);
router.post("/set/occupations", authMiddleware, authorizeMiddleware(Role), setOccupations);

// READ
router.get("/get/designations", authMiddleware, authorizeMiddleware(Role), getDesignations);
router.get("/get/incharges", authMiddleware, authorizeMiddleware(Role), getIncharges);
router.get("/get/incharges-at-location/:locationId", authMiddleware, authorizeMiddleware(Role), getInchargesAtALocation);
router.get("/get/locations", authMiddleware, getLocations);
router.get("/get/occupations", authMiddleware, authorizeMiddleware(Role), getOccupations);
router.get("/get/resolvers", authMiddleware, authorizeMiddleware(Role), getResolvers);
router.get("/get/resolvers-at-location/:locationId", authMiddleware, authorizeMiddleware(Role), getResolversAtALocation);
router.get("/get/tags", authMiddleware, getTags);
router.get("/get/tag-details/:tagId", authMiddleware, authorizeMiddleware(Role), getLocationsDesignationsAndOccupationsBasedOnTag);
router.get("/get/users", authMiddleware, authorizeMiddleware(Role), getUsers);
router.get("/get/incharge/:id", authMiddleware, authorizeMiddleware(Role), getInchargeById);
router.get("/get/resolver/:id", authMiddleware, authorizeMiddleware(Role), getResolverById);

// UPDATE
router.patch("/update/incharge/:id", authMiddleware, authorizeMiddleware(Role), updateInchargeDetails);
router.patch("/update/resolver/:id", authMiddleware, authorizeMiddleware(Role), updateResolverDetails);

// DELETE
router.delete("/remove/locations", authMiddleware, authorizeMiddleware(Role), removeLocations);
router.delete("/remove/tags", authMiddleware, authorizeMiddleware(Role), removeTags);


export const adminRouter = router;