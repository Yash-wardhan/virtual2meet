import { Router } from "express";
import { UpdateMetadataSchema } from "../../types";
import client from "@prisma/client";
import { userMiddleware } from "../../middleware/user";

export const userRouter = Router();

/**
 * @swagger
 * /user/metadata:
 *   post:
 *     summary: Update user metadata
 *     description: Update the user's metadata, such as the avatar ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarId:
 *                 type: string
 *                 description: The ID of the avatar to associate with the user.
 *     responses:
 *       200:
 *         description: Metadata updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed or internal server error.
 */
userRouter.post("/metadata", userMiddleware, async (req, res) => {
    const parsedData = UpdateMetadataSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log("parsed data incorrect");
        res.status(400).json({ message: "Validation failed" });
        return;
    }
    try {
        await client.user.update({
            where: {
                id: req.userId,
            },
            data: {
                avatarId: parsedData.data.avatarId,
            },
        });
        res.json({ message: "Metadata updated" });
    } catch (e) {
        console.log("error");
        res.status(400).json({ message: "Internal server error" });
    }
});

/**
 * @swagger
 * /user/metadata/bulk:
 *   get:
 *     summary: Get bulk user metadata
 *     description: Retrieve metadata for multiple users, including their avatar URLs.
 *     parameters:
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         required: true
 *         description: A comma-separated list of user IDs.
 *     responses:
 *       200:
 *         description: Metadata retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatars:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         description: The ID of the user.
 *                       avatarId:
 *                         type: string
 *                         description: The URL of the user's avatar.
 *       400:
 *         description: Validation failed or user not found.
 */
userRouter.get("/metadata/bulk", async (req, res) => {
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = userIdString.slice(1, userIdString?.length - 1).split(",");
    console.log(userIds);
    const metadata = await client.user.findMany({
        where: {
            id: {
                in: userIds,
            },
        },
        select: {
            avatar: true,
            id: true,
        },
    });

    res.json({
        avatars: metadata.map((m) => ({
            userId: m.id,
            avatarId: m.avatar?.imageUrl,
        })),
    });
});