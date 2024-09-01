require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const Replicate = require("replicate");
const multer = require('multer');
const cors = require('cors');
const app = express();
app.use(cors());

// Initialize Replicate with your API token
const replicate = new Replicate({
    auth: '', // Use environment variable for API token
});

// Define directories
const uploadsDir = path.join(__dirname, 'uploads', 'audio');
const publicDir = path.join(__dirname, 'public');

// Create directories if they don't exist
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Filter to accept only AAC files
const fileFilter = (req, file, cb) => {
    const filetypes = /aac/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only AAC files are allowed!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB file size limit
});

app.post("/convert", upload.single('audio'), async (req, res) => {
    try {
        // Access the uploaded file
        const audioPath = req.file.path;

        // Read the file as a base64 encoded string
        const audioBuffer = fs.readFileSync(audioPath);
        const base64Audio = audioBuffer.toString('base64');

        // Run Replicate model with the base64 encoded audio
        const output = await replicate.run(
            "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
            {
                input: {
                    task: "transcribe",
                    audio: `data:audio/aac;base64,${base64Audio}`,
                    language: "None",
                    timestamp: "chunk",
                    batch_size: 64,
                    diarise_audio: false
                }
            }
        );

        // Send the output to the client
        console.log(output);
        res.json({ output });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during the conversion process.' });
    }
});

// Start the server
app.listen(5001, () => {
    console.log("Server is running on port 5001");
});
