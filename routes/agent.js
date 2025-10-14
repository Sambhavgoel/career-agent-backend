const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const {GoogleGenerativeAI} = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({model:"gemini-2.0-flash-exp"})

// @route   POST /api/agent/analyze
// @desc    Analyze a resume against a job description
// @access  Private

router.post('/analyzer',authMiddleware,async(req,res)=>{
    const {resumeText, jobDescriptionText} = req.body

    if(!resumeText || !jobDescriptionText)
    {
        return res.status(400).json({msg:'Please provide both resume and job description text. '})
    }
    try{
        const jdprompt =
            `Act as an expert technical recruiter. Analyze the following job description and extract the 5 most important technical skills and 3 most important soft skills.
            Return the result ONLY as a JSON object with two keys: "technicalSkills" and "softSkills".
            Job Description: """${jobDescriptionText}"""`
        
        const jdResult = await model.generateContent(jdprompt)
        const jdResponse = await jdResult.response
        const jdJsonText = jdResponse.text().replace(/```json/g,'').replace(/```/g,'').trim()

        const keySkills = JSON.parse(jdJsonText)

        const resumePrompt=`
            Act as a senior career coach. You are analyzing a candidate's resume against the key requirements for a job.
            
            Key Technical Skills Required: ${JSON.stringify(keySkills.technicalSkills)}
            Key Soft Skills Required: ${JSON.stringify(keySkills.softSkills)}

            Candidate's Resume: """${resumeText}"""

            Perform the following analysis and return ONLY a JSON object with the keys "matchScore", "strengths", and "improvements":
            1. "matchScore": An overall score from 0 to 100 on how well the resume matches the job requirements.
            2. "strengths": A short paragraph explaining what the resume does well in relation to the job.
            3. "improvements": A list of 3 concrete, actionable suggestions for how the candidate could improve their resume to better match this specific job.
        `
        const resumeResult = await model.generateContent(resumePrompt)
        const resumeResponse = await resumeResult.response
        const resumeJsonText = resumeResponse.text().replace(/```json/g,'').replace(/```/g,'').trim()
        const analysis = JSON.parse(resumeJsonText)

        res.json(analysis)
        
    }
    catch(error)
    {
        console.error('Error in agent analysis: ',error)
        res.status(500).send('An error occured during the analysis')
    }

})

module.exports = router