import { Router } from "express";
import { userRouter } from "./user";
import { spaceRouter } from "./space";
import { adminRouter } from "./admin";
import { SigninSchema, SignupSchema } from "../../types";
import { hash, compare } from "../../scrypt";
import client from "@prisma/client";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "../../config";

export const router = Router();

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Sign up a new user
 *     description: Create a new user account with username, password, and role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [admin, user]
 *     responses:
 *       200:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   description: The newly created user's ID.
 *       400:
 *         description: Validation failed or user already exists.
 */
router.post("/signup", async (req, res) => {
    console.log("inside signup");
    const parsedData = SignupSchema.safeParse(req.body);
    if (!parsedData.success) {
        console.log("parsed data incorrect");
        res.status(400).json({ message: "Validation failed" });
        return;
    }

    const hashedPassword = await hash(parsedData.data.password);

    try {
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === "admin" ? "Admin" : "User",
            },
        });
        res.json({ userId: user.id });
    } catch (e) {
        console.log("error thrown");
        console.log(e);
        res.status(400).json({ message: "User already exists" });
    }
});

/**
 * @swagger
 * /signin:
 *   post:
 *     summary: Sign in a user
 *     description: Authenticate a user by username and password, and return a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for the authenticated user.
 *       403:
 *         description: User not found or invalid credentials.
 */
router.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(403).json({ message: "Validation failed" });
        return;
    }

    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username,
            },
        });

        if (!user) {
            res.status(403).json({ message: "User not found" });
            return;
        }
        const isValid = await compare(parsedData.data.password, user.password);

        if (!isValid) {
            res.status(403).json({ message: "Invalid password" });
            return;
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            JWT_PASSWORD
        );

        res.json({ token });
    } catch (e) {
        res.status(400).json({ message: "Internal server error" });
    }
});

/**
 * @swagger
 * /elements:
 *   get:
 *     summary: Get all elements
 *     description: Retrieve a list of all elements.
 *     responses:
 *       200:
 *         description: A list of elements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       imageUrl:
 *                         type: string
 *                       width:
 *                         type: number
 *                       height:
 *                         type: number
 *                       static:
 *                         type: boolean
 */
router.get("/elements", async (req, res) => {
    const elements = await client.element.findMany();

    res.json({
        elements: elements.map((e) => ({
            id: e.id,
            imageUrl: e.imageUrl,
            width: e.width,
            height: e.height,
            static: e.static,
        })),
    });
});

/**
 * @swagger
 * /avatars:
 *   get:
 *     summary: Get all avatars
 *     description: Retrieve a list of all avatars.
 *     responses:
 *       200:
 *         description: A list of avatars.
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
 *                       id:
 *                         type: integer
 *                       imageUrl:
 *                         type: string
 *                       name:
 *                         type: string
 */
router.get("/avatars", async (req, res) => {
    const avatars = await client.avatar.findMany();
    res.json({
        avatars: avatars.map((x) => ({
            id: x.id,
            imageUrl: x.imageUrl,
            name: x.name,
        })),
    });
});

router.use("/user", userRouter);
router.use("/space", spaceRouter);
router.use("/admin", adminRouter);