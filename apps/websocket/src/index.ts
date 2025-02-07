import { WebSocketServer } from "ws";
import { UserManager } from "@repo/ws/userManager";
const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", (ws) => {
    console.log("connected to ws server");
    ws.send("hello mere dost");
    UserManager.getInstance().addUser(ws);
});

