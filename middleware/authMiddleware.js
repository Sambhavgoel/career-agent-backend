const jwt = require('jsonwebtoken')

module.exports = function(req,res,next){
    const token = req.header('x-auth-token')



//check if token
if(!token)
{
    return res.status(401).json({msg:'No token, authorization denied'})

}
//verify token
try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET)
    if(!decoded.user)
    {
        return res.status(401).json({msg:'Token is not valid {malformed}'})
    }
    req.user = decoded.user
    next()
}
catch(err)
{
    res.status(401).json({msg: 'token is not valid'})
}
}