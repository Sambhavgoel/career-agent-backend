const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true}
})

UserSchema.pre('save',async function(next){
    if(!this.isModified('password')) // use at the time of any updation in password
    {
        return next()  // go to the next middleware and in this case there is noone 
    }
    const salt = await bcrypt.genSalt(10) //generate randon string of length 10
    this.password = await bcrypt.hash(this.password,salt) // hash the password using salt
    next()
})
module.exports = mongoose.model('User',UserSchema)