// backend/routes/conversations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key is loaded
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in the .env file');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ✅ Use a stable model name
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// GET /api/conversations (List)
router.get('/', authMiddleware, async (req, res) => {
    if (req.user && req.user.isGuest) {
        return res.json([]);
    }
    if (!req.user || !req.user.id) {
         return res.status(401).json({ msg: 'User not properly authenticated.' });
    }
    try {
        const conversations = await Conversation.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select('_id title');
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations list:', error);
        res.status(500).json({ msg: 'Server Error fetching conversation list.' }); // Send JSON error
    }
});

// GET /api/conversations/:id (History)
router.get('/:id', authMiddleware, async (req, res) => {
    if (req.user && req.user.isGuest) {
         return res.status(403).json({ msg: 'Guests do not have saved conversations.' });
    }
    if (!req.user || !req.user.id) {
         return res.status(401).json({ msg: 'User not properly authenticated.' });
    }
    try {
        const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user.id });
        if (!conversation) {
            return res.status(404).json({ msg: 'Conversation not found or does not belong to user.' });
        }
        res.json(conversation.messages);
    } catch (error) {
        console.error('Error fetching specific conversation history:', error);
         if (error.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid conversation ID format.' });
         }
        res.status(500).json({ msg: 'Server Error fetching conversation history.' }); // Send JSON error
    }
});

// POST /api/conversations (Send Message)
router.post('/', authMiddleware, async (req, res) => {
    const { message, conversationId, history } = req.body;
    const isGuest = req.user && req.user.isGuest;

    if (!message) {
        return res.status(400).json({ msg: 'Message content is required.' });
    }

    try {
        // 1. Get AI Response
        const chat = model.startChat({ history: history || [] });
        const instruction = "You are a helpful and expert career coach. Answer the user's question concisely and professionally. Please use Markdown for formatting (like lists, bold text, and code blocks). User's question: ";
        const result = await chat.sendMessage(instruction + message);

        if (!result || !result.response || typeof result.response.text !== 'function') {
             console.error('Invalid response structure received from Gemini API:', result);
             throw new Error('Invalid response structure from AI service.');
        }
        const aiReplyText = result.response.text();

        const userMessage = { role: 'user', parts: [{ text: message }] };
        const aiMessage = { role: 'model', parts: [{ text: aiReplyText }] };
        let savedConversationId = conversationId;

        // 2. Save to Database ONLY if NOT a guest
        if (!isGuest) {
             if (!req.user || !req.user.id) {
                 console.error('User ID missing when trying to save conversation.');
             } else {
                 let conversation;
                 if (conversationId) {
                     conversation = await Conversation.findOneAndUpdate(
                         { _id: conversationId, user: req.user.id },
                         { $push: { messages: { $each: [userMessage, aiMessage] } } },
                         { new: true, runValidators: true }
                     );
                 } else {
                     const title = message.substring(0, 30);
                     conversation = new Conversation({
                         user: req.user.id,
                         title: title,
                         messages: [userMessage, aiMessage]
                     });
                     await conversation.save();
                 }

                 if (conversation) {
                     savedConversationId = conversation._id;
                 } else if (conversationId) {
                     console.warn(`Could not find conversation with ID ${conversationId} for user ${req.user.id} to update.`);
                 } else {
                     console.error(`Failed to save new conversation for user ${req.user.id}.`);
                 }
            }
        }

        // 3. Send Response to Client
        res.json({
            reply: aiReplyText,
            conversationId: savedConversationId
        });

    } catch (error) {
        console.error('Error on conversation POST:', error); // Log the actual error
        // Send specific error if it's from Google API config, otherwise generic
        if (error.message && error.message.includes('API key not valid') || error.message && error.message.includes('permission') || error.status === 404) {
             res.status(500).json({ msg: 'AI service configuration error. Please check API key and Google Cloud settings.' });
        } else {
             res.status(500).json({ msg: 'Failed to process chat message due to a server error.' });
        }
    }
});

module.exports = router;