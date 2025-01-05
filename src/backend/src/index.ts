import express from "express";
import dotenv from "dotenv";
import { router } from "./routes/v1";
import { PrismaClient } from "@prisma/client";
import { swaggerUi, swaggerDocs } from "./swagger.mjs";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("API is running!");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use("/api/v1", router);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export { prisma };