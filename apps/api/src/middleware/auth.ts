import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { NextFunction } from "express";

dotenv.config();

const secret: string | undefined = process.env.JWT_SECRET;

export const authMiddleware = async (req: any, res: any, next: NextFunction) => {
    try {
        const token = req.cookies.token;
        if(!token) {
            throw new Error("No token provided");
        }

        const decoded: any = jwt.verify(token, secret as string);
        req.user = { id: decoded.userId, role: decoded.role };
        next();
    } catch(err) {
        res.status(401).json({
            ok: false,
            error: err instanceof Error ? err.message : "An error occurred while authenticating the user"
        });
    }
}

export const authorizeMiddleware = (requiredRole: any) => {
    return (req: any, res: any, next: NextFunction) => {
        const userRole = req.user?.role;
        const roles = Object.values(requiredRole);
        if(roles.includes(userRole)) {
            next();
        } else {
            return res.status(403).json({ error: "Forbidden" });
        }
    };
};