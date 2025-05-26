import dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const sender = process.env.TWILIO_FROM;

export const notifyViaSms = async (
    recipients: string[],
    messageToBeSent: string
): Promise<unknown> => {

    const smsPromises = recipients.map((recipient) => {
        return client.messages
            .create({
                body: messageToBeSent,
                from: sender,
                to: recipient,
            })
            .then((message: any) => {
                console.log(`Message sent to ${recipient}, SID: ${message.sid}`);
                return message.sid;
            })
            .catch((err: any) => {
                console.error(`Failed to send SMS to ${recipient}: ${err.message}`);
                return null; // Or throw err to stop all if one fails
            });
    });

    const results = await Promise.all(smsPromises);

    console.log("All messages attempted:");
    console.log(results);

    return results;
};
