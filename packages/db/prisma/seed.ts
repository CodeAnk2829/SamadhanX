import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const tags = await prisma.tag.createMany({
            data: [
                { tagName: "Hostel" },
                { tagName: "Department" },
                { tagName: "Mess" },
                { tagName: "Cleaning" },
                { tagName: "Sports" },
                { tagName: "Data Center" },
                { tagName: "Internet" },
                { tagName: "WiFi" },
                { tagName: "LAN" },
                { tagName: "Electricity" },
                { tagName: "Equipment" },
                { tagName: "Carpentry" },
                { tagName: "Dispensary" },
                { tagName: "Ambulance" },
                { tagName: "Medical Service" },
                { tagName: "Canteen" },
                { tagName: "Library" },
                { tagName: "Bus Service" },
                { tagName: "Ragging" },
                { tagName: "Personal Issue" },
                { tagName: "Lab" },
                { tagName: "Lift" },
                { tagName: "Vending machine" },
                { tagName: "Projector" },
                { tagName: "Classroom" },
                { tagName: "Stationary" },
                { tagName: "Furniture" },
                { tagName: "Plumbing" },
                { tagName: "Gardening" },
                { tagName: "Security" },
                { tagName: "Parking" },
                { tagName: "Water" },
                { tagName: "All" },
                { tagName: "Others" }
            ]
        });

        if (!tags) {
            throw new Error("Could not create tags");
        }

        console.log("Tags created successfully");

        const designations = await prisma.designation.createMany({
            data: [
                { designationName: "HOD" },
                { designationName: "Chief of Warden (COW)" },
                { designationName: "Warden" },
                { designationName: "Assistant Warden" },
                { designationName: "Care Taker" },
                { designationName: "Mess Convener" },
                { designationName: "Technical Head" },
                { designationName: "Library Incharge" },
                { designationName: "Others" }
            ]
        });

        if (!designations) {
            throw new Error("Could not create designations");
        }

        console.log("Designations created successfully");

        const occupations = await prisma.occupation.createMany({
            data: [
                { occupationName: "Cleaner" },
                { occupationName: "Electrician" },
                { occupationName: "Plumber" },
                { occupationName: "Watchman" },
                { occupationName: "Ambulance Driver" },
            ]
        });

        if (!occupations) {
            throw new Error("Could not create occupations");
        }

        console.log("Occupations created successfully");

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();