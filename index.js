const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Initialize Express
const app = express();
app.use(fileUpload());

// AWS SDK configuration
const s3Client = new S3Client({
    region: 'us-east-1'
});

app.get('/', (req, res) => {
    res.send('S3 bucket');
  });

// List all objects in a bucket
app.get('/listObjects', async (req, res) => {
    const listObjectsParams = {
        Bucket: 'iam-bucket-2024'
    };
    try {
        const listObjectsResponse = await s3Client.send(new ListObjectsV2Command(listObjectsParams));
        res.json(listObjectsResponse.Contents);
    } catch (error) {
        console.error("Error listing objects:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Upload an object to a bucket
app.post('/upload', async (req, res) => {
    const file = req.files.file;
    const fileName = req.files.file.name;
    const tempPath = `./uploads/${fileName}`;
    file.mv(tempPath, async (err) => {
        if (err) {
            console.error("Error uploading file:", err);
            res.status(500).send("Internal Server Error");
        } else {
            const fileStream = fs.createReadStream(tempPath);
            const uploadParams = {
                Bucket: 'iam-bucket-2024',
                Key: fileName,
                Body: fileStream
            };
            try {
                await s3Client.send(new PutObjectCommand(uploadParams));
                res.send("File uploaded successfully!");
            } catch (error) {
                console.error("Error uploading file to S3:", error);
                res.status(500).send("Internal Server Error:" + error);
            }
        }
    });
});

// Retrieve an object from a bucket
app.get('/getObject/:key', async (req, res) => {
    const key = req.params.key;
    const getObjectParams = {
        Bucket: 'iam-bucket-2024',
        Key: key
    };
    try {
        const getObjectResponse = await s3Client.send(new GetObjectCommand(getObjectParams));
        const objectData = await streamToString(getObjectResponse.Body);
        res.send(objectData);
    } catch (error) {
        console.error("Error retrieving object from S3:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Helper function to convert readable stream to string
const streamToString = async (stream) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', (error) => reject(error));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
};

// Start the server
const PORT = 4566;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
