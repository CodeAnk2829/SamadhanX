import express from "express";
import { createClient } from "redis";

import { userRouter } from "./routes/user";

export const publisher = createClient();
const app = express();

app.use(express.json());

app.use("/api/v1/user", userRouter);

async function startServer() {
    try {
        await publisher.connect();
        console.log("Connected to Redis");

        app.listen(3000, () => {
            console.log("server is listening to port 3000");
        });
    } catch(err) {
        console.error(err);
    }
}
startServer();