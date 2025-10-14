// backend/routes/conversations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// @route   GET /api/conversations
// @desc    Get a list of all user's conversations (id and title only)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    // console.log('Request received at GET1 /api/conversations'); 
    try {
       
        const conversations = await Conversation.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select('_id title');

        
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations list:', error);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/conversations/:id
// @desc    Get the full history of a specific conversation
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    // console.log('Request received at GET2 /api/conversations'); 
    try {
        const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user.id });
        if (!conversation) {
            return res.status(404).json({ msg: 'Conversation not found' });
        }
        res.json(conversation.messages);
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/conversations
// @desc    Send a message (creates a new conversation or adds to an existing one)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    // console.log('Request received at POST /api/conversations');
    const { message, conversationId } = req.body;
    const history = req.body.history || [];
    try {
        const chat = model.startChat({ history });
        const instruction = "You are a helpful and expert career coach. Answer the user's question concisely and professionally. Please use Markdown for formatting (like lists, bold text, and code blocks). User's question: ";
        const result = await chat.sendMessage(instruction + message);
        const aiReplyText = result.response.text();
        const userMessage = { role: 'user', parts: [{ text: message }] };
        const aiMessage = { role: 'model', parts: [{ text: aiReplyText }] };
        let conversation;
        if (conversationId) {
            conversation = await Conversation.findOneAndUpdate(
                { _id: conversationId, user: req.user.id },
                { $push: { messages: { $each: [userMessage, aiMessage] } } },
                { new: true }
            );
        } else {
            const title = message.substring(0, 30);
            conversation = new Conversation({
                user: req.user.id,
                title: title,
                messages: [userMessage, aiMessage]
            });
            await conversation.save();

            if (!conversation) {
            return res.status(404).json({ msg: 'Conversation could not be found or updated.' });
        }
        }
        res.json({
            reply: aiReplyText,
            conversationId: conversation._id
        });
    } catch (error) {
        console.error('Error on conversation POST : ', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;