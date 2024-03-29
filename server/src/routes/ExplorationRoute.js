var express = require('express')
const fs = require("fs");
const Auth = require('../middleware/auth');

const ExplorationRoute = express.Router()
const Exploration = require('../db/models/Exploration')
const User = require('../db/models/User')
const Question = require('../db/models/Questions')


ExplorationRoute.get('/explorations', Auth.verifyUserToken, async (req, res) =>{
    if(req.decoded.role != 'ADMIN'){
        const user = await User.findOne({email: req.decoded.email});
        Exploration.find({participants: user._id}).populate('coordinator').populate('participants').exec(function (err, docs) {
            console.log(docs);
            res.send(docs)
        })
    }else{
        Exploration.find({}).populate('coordinator').populate('participants').exec(function (err, docs) {
            res.send(docs)
        })
    }

})

ExplorationRoute.get('/exploration/:id', (req, res) =>{
    Exploration.findById(req.params.id).populate('coordinator').populate('participants').populate('questions').exec(function (err, docs) {
        res.send(docs)
    })
})

ExplorationRoute.post('/addexploration', async (req, res) =>{
    const exploration = new Exploration(req.body.exploration);
    await exploration.save(function(err, doc){
        if(err){
            res.send(err);
            throw err;
        }
        res.send(doc);
    })
})

ExplorationRoute.post('/editexploration', Auth.verifyUserToken, Auth.verifyModerator, async (req, res) =>{
     await Exploration.findOneAndUpdate({_id: req.body.exploration._id}, req.body.exploration, {new: true}, (err,doc) =>{
         if(err){
             res.send(err);
             throw err;
         }
         res.send(doc);
     })
})

ExplorationRoute.get('/explorationsdelete/:id', Auth.verifyUserToken, Auth.verifyAdmin, async (req,res) =>{
    Exploration.findByIdAndRemove(req.params.id).exec(function(err,docs){
        if(err){
            res.send(err);
            throw err;
        }
        res.send(docs);
    })
})

ExplorationRoute.post('/add_canvas/:id', async (req,res) =>{
    const exploration = await Exploration.findById( req.params.id );
    const questions = req.body.questions;
    await questions.forEach(async (question) =>{
        const questionM = new Question({...question});
        const q = await questionM.save();
        await exploration.update({$push:{questions : q}});
    });

    if(exploration) res.send(exploration)
});

//editexploration_videos

ExplorationRoute.post('/editexploration_videos/:id', async (req,res) =>{
    const exploration = await Exploration.findById( req.params.id );
    const videos = req.body.videos;
    await videos.forEach(async (video) =>{
        await exploration.update({$push:{videos : video}});
    });
    if(exploration) res.send(exploration)
});

//exploration_file

ExplorationRoute.post('/exploration_file', async (req,res) =>{
    const text = "test.json";
    console.log(req.body)
    console.log(req.body.json);
    await fs.writeFile(text,JSON.stringify(req.body.json),function (err, fd) {
        if (err) return console.log(err);
        res.download(text);
    });
});

ExplorationRoute.post('/question_answers', Auth.verifyUserToken, async (req,res) =>{
    const answers = req.body;
    answers.forEach(async (answer) => {
            const question = await Question.findById(answer.question_id);
            if(question.type == 'SINGLE'){
                const possibleAnswer = question.possibleAnswers.find((answerObj) => answerObj._id == answer.answer_id)
                possibleAnswer.checked++;
                await question.save();
            }else if(question.type == 'MULTY'){
                const arrayOfElements = question.possibleAnswers.filter((an) => {
                    return answer.answer_id.indexOf(an._id.toString()) > -1;
                });
                arrayOfElements.map((el) => {
                    el.checked++;
                })
                await question.save();
            }
    })
    res.send({message: "Success"});
})

module.exports = ExplorationRoute;
