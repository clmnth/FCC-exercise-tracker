const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require("body-parser")

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

//  Create user model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  }
});
const User = mongoose.model("User", userSchema);

//  Create exercise model
const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
  },
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Get a list of all users
app.get("/api/users", async (req, res) => {
  const userList = await User.find({}).select("_id username");
  if (userList) {
    res.json(userList);
  } else {
    res.send("No users");
  }
})

// Create a new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username;

  try {
    const newUser = new User({
      username: username
    })
    const user = await newUser.save();
    res.json({
      username: user.username,
      _id: user._id
    });
  } catch (error) {
    console.log(error);
  }
});

// Add exercises
app.post("/api/users/:_id/exercises", async (req, res) => {

  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const userCheck = await User.findById(id);
    if (!userCheck) {
      res.send("User does not exist")
    } else {
      let newExercise = new Exercise({
        user_id: userCheck._id,
        description: description,
        duration: duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await newExercise.save();
      res.json({
        _id: userCheck._id,
        username: userCheck.username,
        date: new Date(exercise.date).toDateString(),
        duration: exercise.duration,
        description: exercise.description
      })
    }
  } catch (error) {
    console.log(error);
  }

});

// Get a user log
app.get("/api/users/:_id/logs", async (req, res) => {
  const id_input = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const userCheck = await User.findById(id_input);

    if (!userCheck) {
      console.error(error);
      res.send("User does not exist")
    }

    // Define a query object that will be used to filter the exercises based on the user_id.
    const idObj = { user_id: id_input };

    if (from && to) {
      idObj.date = { $gte: new Date(from), $lte: new Date(to) };
    } else if (from) {
      idObj.date = { $gte: new Date(from) };
    } else if (to) {
      idObj.date = { $lte: new Date(to) };
    }


    // const exercises = await Exercise.find({ user_id: id_input });
    let filteredExercises = Exercise.find(idObj).sort({ date: "desc" });
    if (limit) {
      // Convert string to integer
      const limitInt = parseInt(limit);
      filteredExercises = filteredExercises.limit(limitInt);
    }

    const count = await Exercise.countDocuments(idObj);
    const exercises = await filteredExercises;
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    // const count = await Exercise.countDocuments({ user_id: id_input });
    // const exercises = await Exercise.find({ user_id: id_input });
    // const log = exercises.map((exercise) => ({
    //   description: exercise.description,
    //   duration: exercise.duration,
    //   date: exercise.date.toDateString(),
    // }));

    res.json({
      _id: userCheck._id,
      username: userCheck.username,
      count: count,
      log: log
    })
  } catch (error) {
    console.log(error);
  }

})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
