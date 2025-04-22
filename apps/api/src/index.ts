import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { userRouter } from "./routes/user";
import { adminRouter } from "./routes/admin";
import { complaintRouter } from "./routes/complaint";
import { inchargeRouter } from "./routes/incharge";

const app = express();
const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
};
dotenv.config();

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/complaint", complaintRouter);
app.use("/api/v1/incharge", inchargeRouter);
app.use("/api/v1/user", userRouter);


app.listen(3000, () => {
    console.log("Server is listening to port 3000")
});