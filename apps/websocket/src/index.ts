import { WebSocketServer } from "ws";
import { UserManager } from "@repo/ws2/userManager";
const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", (ws) => {
    console.log("connected to ws server");

    ws.on('message', (message: string) => {
        const userId = JSON.parse(message).userId;
        const role = JSON.parse(message).role;
        
        UserManager.getInstance().addUser(userId, role, message, ws);
    });

    ws.send('Hello! Message From Server!!');
});