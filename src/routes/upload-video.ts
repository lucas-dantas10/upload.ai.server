import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { fastifyMultipart } from "@fastify/multipart";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import fs from 'node:fs';

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fieldSize: 1_848_576 * 25, // 25mb
        }
    });

    app.post('/videos', async (req, rep) => {
        const data = await req.file();

        if (!data) {
            return rep.status(400).send({ error: "Missing file input." })
        }

        const extension = path.extname(data.filename);

        if (extension !== '.mp3') {
            return rep.status(400).send({ error: 'Invalid input type, please upload a MP3' });
        }

        const fileBaseName = path.basename(data.filename, extension);

        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination));

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination
            }
        });

        return {
            video
        }
    });
}