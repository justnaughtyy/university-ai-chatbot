require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dialogflow = require('@google-cloud/dialogflow');
const { Firestore } = require('@google-cloud/firestore');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// --- ตั้งค่าการเชื่อมต่อ ---
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

// 1. เชื่อมต่อ Dialogflow
const sessionClient = new dialogflow.SessionsClient({
    keyFilename: './unichatbot56-e74c2bbcbdc8.json' // <<-- แก้ชื่อไฟล์ตรงนี้
});

// 2. เชื่อมต่อ Firestore
const firestore = new Firestore({
    projectId: projectId,
    keyFilename: './unichatbot56-e74c2bbcbdc8.json' // <<-- แก้ชื่อไฟล์ตรงนี้
});

// --- สร้าง API Endpoint ---

app.post('/api/chat', async (req, res) => {
    const { message, sessionId = uuidv4() } = req.body;

    try {
        // 1. ส่งข้อความไป Dialogflow (เหมือนเดิม)
        const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
        const request = { /* ... เหมือนเดิม ... */ };
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        const intent = result.intent ? result.intent.displayName : 'Default Fallback Intent';

        // 2. ค้นหาคำตอบจาก Firestore แบบ Dynamic ตาม Intent ที่ได้มา
        let botResponse = result.fulfillmentText; // ใช้คำตอบจาก Fallback เป็นค่าเริ่มต้น

        const intentDocRef = firestore.collection('knowledge_base').where('intentName', '==', intent).limit(1);
        const intentSnapshot = await intentDocRef.get();

        if (!intentSnapshot.empty) {
            const intentData = intentSnapshot.docs[0].data();
            // สุ่มคำตอบจาก array เพื่อให้บอทดูเป็นธรรมชาติ
            const responsesArray = intentData.responses;
            botResponse = responsesArray[Math.floor(Math.random() * responsesArray.length)];
        }

        // 3. เก็บ Log (เหมือนเดิม)
        // 4. ส่งคำตอบกลับ (เหมือนเดิม)
        res.json({ reply: botResponse, sessionId });

    } catch (error) {
        console.error('ERROR:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});