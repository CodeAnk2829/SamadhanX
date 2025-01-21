import client from "@repo/db/client";
import { Router } from "express";
import { publisher } from "../index";

export const userRouter = Router();

userRouter.get("/", async (req: any, res: any) => {
    const users = await client.user.findMany();
    if (!users) {
        return res.status(404).json({ message: "No users found" });
    }
    await publisher.lPush("message", JSON.stringify(users));
    console.log("Published message", users);
    res.json(users);
});

userRouter.post("/", async (req, res) => {
    const user = await client.user.create({
        data: req.body,
    });
    res.json(user);
});