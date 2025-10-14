require('dotenv').config();//loads from .env files
const express = require('express')
const cors = require('cors')
const connectDB = require('./db')
// const mongoose = require('mongoose')

//db.js - to connect
connectDB()

const app = express()    // import express
const PORT = process.env.PORT || 5001    //define port

const frontend = {
    origin : "https://career-agent-frontend-delta.vercel.app"
}
//middlewares
app.use(cors(frontend))
app.use(express.json())

//connect routes to server
app.use('/api/auth',require('./routes/auth'))
//genAI
app.use('/api/conversations',require('./routes/conversations'))
//resume analysis - agent
app.use('/api/agent',require('./routes/agent'))


//basic Testing Routes
app.get('/',(req,res)=>{
    res.send("Carrer Agent is on the air !")
})



//Run app
app.listen(PORT,()=>{
    console.log(`Server is running on PORT ${PORT}`);
})
