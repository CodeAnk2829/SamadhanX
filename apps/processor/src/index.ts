import  client  from "@repo/db/client";
import { createClient } from "redis";

const consumer = createClient();

async function main() {
    try {
        await consumer.connect();
        console.log("Connected to Redis");

        const data = await consumer.brPop("message", 0);
        console.log("Received message", data);
    } catch(err) {
        console.error(err);
    }
}

main();