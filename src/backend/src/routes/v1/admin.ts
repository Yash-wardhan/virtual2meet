import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin";
import { AddElementSchema, CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from "../../types";
import client from "@prisma/client";

export const adminRouter = Router();
adminRouter.use(adminMiddleware);

/**
 * @swagger
 * /admin/element:
 *   post:
 *     summary: Create a new element
 *     description: Creates a new element with specified width, height, and image URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               static:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Element created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 */
adminRouter.post("/element", async (req, res) => {
    const parsedData = CreateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }

    const element = await client.element.create({
        data: {
            width: parsedData.data.width,
            height: parsedData.data.height,
            static: parsedData.data.static,
            imageUrl: parsedData.data.imageUrl,
        },
    });

    res.json({
        id: element.id,
    });
});

/**
 * @swagger
 * /admin/element/{elementId}:
 *   put:
 *     summary: Update an element
 *     description: Updates the image URL of a specific element.
 *     parameters:
 *       - in: path
 *         name: elementId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the element to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Element updated successfully.
 */
adminRouter.put("/element/:elementId", (req, res) => {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }

    client.element.update({
        where: {
            id: req.params.elementId,
        },
        data: {
            imageUrl: parsedData.data.imageUrl,
        },
    });
    res.json({ message: "Element updated" });
});

/**
 * @swagger
 * /admin/avatar:
 *   post:
 *     summary: Create a new avatar
 *     description: Creates a new avatar with a name and image URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Avatar created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 avatarId:
 *                   type: string
 */
adminRouter.post("/avatar", async (req, res) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }
    const avatar = await client.avatar.create({
        data: {
            name: parsedData.data.name,
            imageUrl: parsedData.data.imageUrl,
        },
    });
    res.json({ avatarId: avatar.id });
});

/**
 * @swagger
 * /admin/map:
 *   post:
 *     summary: Create a new map
 *     description: Creates a new map with a name, dimensions, thumbnail, and default elements.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dimensions:
 *                 type: string
 *                 example: "800x600"
 *               thumbnail:
 *                 type: string
 *               defaultElements:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     elementId:
 *                       type: string
 *                     x:
 *                       type: integer
 *                     y:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Map created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 */
adminRouter.post("/map", async (req, res) => {
    const parsedData = CreateMapSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }
    const map = await client.map.create({
        data: {
            name: parsedData.data.name,
            width: parseInt(parsedData.data.dimensions.split("x")[0]),
            height: parseInt(parsedData.data.dimensions.split("x")[1]),
            thumbnail: parsedData.data.thumbnail,
            mapElements: {
                create: parsedData.data.defaultElements.map((e) => ({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y,
                })),
            },
        },
    });

    res.json({
        id: map.id,
    });
});