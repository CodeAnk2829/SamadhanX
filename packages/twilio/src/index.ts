import dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const sender = process.env.TWILIO_FROM;

console.log(accountSid);
console.log(authToken);
console.log(sender);

export const sendSMS = (recipients: string[], messageToBeSent: string): Promise<String> => {
    console.log(recipients);
    console.log(messageToBeSent);
    console.log("inside sendsms");
    return new Promise(resolve => {
        recipients.forEach((recipient) => {
            client.messages
                .create({
                    body: `${messageToBeSent}`,
                    from: sender,
                    to: recipient,
                })
                .then((message: any) => {
                    console.log(message.sid);
                    resolve(message.sid);
                })
                .catch((err: any) => {
                    console.log("we are in promise catch");
                    console.log(err.message);
                });
        }); 
    });
};