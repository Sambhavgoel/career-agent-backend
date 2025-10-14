const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
    role:{
        type:String,
        enum:['user','model'],
        required:true
    },
    parts:[{
        text:{
            type:String,
            required:true
        }
    }]
},{_id:false})

const ConversationalSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        
    },
    title:{
        type:String,
        required:true
    },
    messages:[MessageSchema]
},{timestamps:true})

module.exports = mongoose.model('Conversation',ConversationalSchema)