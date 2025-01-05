import { Router } from "express";
import client from "@prisma/client";
import { userMiddleware } from "../../middleware/user";
import { AddElementSchema, CreateElementSchema, CreateSpaceSchema, DeleteElementSchema } from "../../types";

export const spaceRouter = Router();

/**
 * @swagger
 * /space:
 *   post:
 *     summary: Create a new space
 *     description: Create a new space with or without a map.
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
 *               mapId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Space created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spaceId:
 *                   type: string
 *       400:
 *         description: Validation failed or map not found.
 */
spaceRouter.post("/", userMiddleware, async (req, res) => {
    console.log("endpoint");
    const parsedData = CreateSpaceSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log(JSON.stringify(parsedData));
        res.status(400).json({ message: "Validation failed" });
        return;
    }

    if (!parsedData.data.mapId) {
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: parseInt(parsedData.data.dimensions.split("x")[0]),
                height: parseInt(parsedData.data.dimensions.split("x")[1]),
                creatorId: req.userId!,
            },
        });
        res.json({ spaceId: space.id });
        return;
    }

    const map = await client.map.findFirst({
        where: { id: parsedData.data.mapId },
        select: { mapElements: true, width: true, height: true },
    });
    if (!map) {
        res.status(400).json({ message: "Map not found" });
        return;
    }

    const space = await client.$transaction(async () => {
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: map.width,
                height: map.height,
                creatorId: req.userId!,
            },
        });

        await client.spaceElements.createMany({
            data: map.mapElements.map((e) => ({
                spaceId: space.id,
                elementId: e.elementId,
                x: e.x!,
                y: e.y!,
            })),
        });

        return space;
    });
    res.json({ spaceId: space.id });
});

/**
 * @swagger
 * /space/element:
 *   delete:
 *     summary: Delete an element from a space
 *     description: Deletes a specific element within a space.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: The ID of the element to delete.
 *     responses:
 *       200:
 *         description: Element deleted successfully.
 *       400:
 *         description: Validation failed or unauthorized access.
 */
spaceRouter.delete("/element", userMiddleware, async (req, res) => {
    const parsedData = DeleteElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }
    const spaceElement = await client.spaceElements.findFirst({
        where: { id: parsedData.data.id },
        include: { space: true },
    });
    if (!spaceElement?.space.creatorId || spaceElement.space.creatorId !== req.userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    await client.spaceElements.delete({ where: { id: parsedData.data.id } });
    res.json({ message: "Element deleted" });
});

/**
 * @swagger
 * /space/{spaceId}:
 *   delete:
 *     summary: Delete a space
 *     description: Deletes a space by its ID.
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space to delete.
 *     responses:
 *       200:
 *         description: Space deleted successfully.
 *       400:
 *         description: Space not found.
 *       403:
 *         description: Unauthorized access.
 */
spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
    const space = await client.space.findUnique({
        where: { id: req.params.spaceId },
        select: { creatorId: true },
    });
    if (!space) {
        res.status(400).json({ message: "Space not found" });
        return;
    }
    if (space.creatorId !== req.userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    await client.space.delete({ where: { id: req.params.spaceId } });
    res.json({ message: "Space deleted" });
});

/**
 * @swagger
 * /space/all:
 *   get:
 *     summary: Get all spaces
 *     description: Retrieve all spaces created by the authenticated user.
 *     responses:
 *       200:
 *         description: A list of spaces.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spaces:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       thumbnail:
 *                         type: string
 *                       dimensions:
 *                         type: string
 */
spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const spaces = await client.space.findMany({ where: { creatorId: req.userId! } });
    res.json({
        spaces: spaces.map((s) => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail,
            dimensions: `${s.width}x${s.height}`,
        })),
    });
});

/**
 * @swagger
 * /space/element:
 *   post:
 *     summary: Add an element to a space
 *     description: Adds a new element to a specific space.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               spaceId:
 *                 type: string
 *               elementId:
 *                 type: string
 *               x:
 *                 type: integer
 *               y:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Element added successfully.
 *       400:
 *         description: Validation failed or space not found.
 */
spaceRouter.post("/element", userMiddleware, async (req, res) => {
    const parsedData = AddElementSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" });
        return;
    }
    const space = await client.space.findUnique({
        where: { id: req.body.spaceId, creatorId: req.userId! },
        select: { width: true, height: true },
    });
    if (req.body.x < 0 || req.body.y < 0 || req.body.x > space?.width! || req.body.y > space?.height!) {
        res.status(400).json({ message: "Point is outside of the boundary" });
        return;
    }
    if (!space) {
        res.status(400).json({ message: "Space not found" });
        return;
    }
    await client.spaceElements.create({
        data: {
            spaceId: req.body.spaceId,
            elementId: req.body.elementId,
            x: req.body.x,
            y: req.body.y,
        },
    });
    res.json({ message: "Element added" });
});

/**
 * @swagger
 * /space/{spaceId}:
 *   get:
 *     summary: Get details of a specific space
 *     description: Retrieve details of a space and its elements.
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Space details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dimensions:
 *                   type: string
 *                 elements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       element:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           width:
 *                             type: integer
 *                           height:
 *                             type: integer
 *                           static:
 *                             type: boolean
 *                       x:
 *                         type: integer
 *                       y:
 *                         type: integer
 */
spaceRouter.get("/:spaceId", async (req, res) => {
    const space = await client.space.findUnique({
        where: { id: req.params.spaceId },
        include: {
            elements: {
                include: {
                    element: true,
                },
            },
        },
    });
    if (!space) {
        res.status(400).json({ message: "Space not found" });
        return;
    }
    res.json({
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map((e) => ({
            id: e.id,
            element: {
                id: e.element.id,
                imageUrl: e.element.imageUrl,
                width: e.element.width,
                height: e.element.height,
                static: e.element.static,
            },
            x: e.x,
            y: e.y,
        })),
    });
});