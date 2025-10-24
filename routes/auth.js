// To create Api endpoints for registration and login
//give db user schema a route- so that user can interact with database using different routes - RESTful APIs

const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// console.log('--- In auth.js, the imported User is:', User); 

router.post('/register',async(req,res)=>{
    const {name,email,password} = req.body;

    try{
        let user = await User.findOne({email})//if already exists
        if(user)
        {
            return res.status(400).json({msg:'User already exists'})

        }

        //create new one
        user = new User({name,email,password})
        await user.save()


        //maintain jwt token for limit the time of usage, helps to avoid any attack
        const payload = {user:{id:user.id}}
        jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:'5h'},(err,token)=>{
            if(err)throw err;
            res.json({token})
        })
    }
    catch(err)
    {
        console.error(err.message)
        res.status(500).send('Server Error')
    }
})



router.post('/login',async(req,res)=>{
    const{email,password} = req.body

    try{
        const user = await User.findOne({email})
        if(!user)
        {
            return res.status(400).json({msg:'Invalid Credentials'})
        }
        const isMatch = await bcrypt.compare(password,user.password)
        if(!isMatch)
        {
            return res.status(400).json({msg:'Invalid Credentials'})

        }

        const payload = {user:{id:user.id}}
        jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:'5h'},(err,token)=>{
            if(err)throw err
            res.send({token})
        })
    }
    catch(err){
        console.log(err)
        res.status(500).send('Server Error')
    }
})

// @route   POST /api/auth/guest
// @desc    Authenticate as a guest user & get token
router.post('/guest', async (req, res) => {
  try {
    // Option 1: Using a generic guest identifier
    const payload = {
      user: {
        id: 'GUEST_USER_ID', // A generic, non-database ID
        isGuest: true
      }
    };
    // Option 2: No specific ID, just a flag
    // const payload = { isGuest: true };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router