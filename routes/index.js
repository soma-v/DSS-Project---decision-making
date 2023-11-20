var express = require('express');
var router = express.Router();

const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');  // jwt


// using local storage to generate a token
if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

// this is the process to encrypt a password in such a way so that it can be decrypted back
var crypto = require("crypto");

let secrateKey = "secrateKey";

function encrypt(text) {
    encryptalgo = crypto.createCipher('aes192', secrateKey);
    let encrypted = encryptalgo.update(text, 'utf8', 'hex');
    encrypted += encryptalgo.final('hex');
    return encrypted;
}

function decrypt(encrypted) {
    decryptalgo = crypto.createDecipher('aes192', secrateKey);
    let decrypted = decryptalgo.update(encrypted, 'hex', 'utf8');
    decrypted += decryptalgo.final('utf8');
    return decrypted;
}

// bcrypt is the way of encrypting a password, so that it cannot be decrypted back
var bcrypt = require('bcryptjs');

var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })


var collectionModel = require('../mongoose');
const { json } = require('body-parser');

// ----- middlewares started ----- // 

function checkToken(req,res,next){
  var myToken = localStorage.getItem('myToken');
  var userDetails = req.session.userRecord;
  if(userDetails)
    {
      next();
    }
  else{
      return res.redirect('/');
    }
  } ;


var checkIfLoggedIn = function(req,res,next){
  var check = localStorage.getItem('myToken');
  var userDetails = req.session.userRecord;
  if(userDetails)
  {
    {
      if(check)
        return  res.redirect('/dashboard');
      else
        next();
    }
  }
  else{
  next();
  }
}


/* GET home page. */
router.get('/',checkIfLoggedIn, function(req, res, next) {
  res.render('home', { title: 'Rescue' });
});

router.get('/signIn', checkIfLoggedIn, function(req, res, next) {
  res.render('signIn', { title: 'Rescue' });
});

router.get('/signUp', checkIfLoggedIn, function(req, res, next) {
  res.render('signUp', { title: 'Rescue' });
});

router.get('/about', function(req, res, next) {
  res.render('about', { title: 'Rescue' });
});

router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'Rescue' });
});

router.get('/dashboard', checkToken, function(req, res, next) {
  var userDetails = req.session.userRecord;
  res.render('dashboard', { title: 'Rescue' , page : 'dashboard', user:userDetails });
});

router.get('/incidentHandling',checkToken, function(req, res, next) {
  res.render('incidentHandlingPage', { title: 'Rescue',page : 'incidentHandling'});
});

router.get('/reportDisaster', function(req, res, next) {
  collectionModel.find({}, function(err, agencies) {
    if (err) {
      return next(err);
    }
    res.render('userReport', { title: 'Rescue', page: 'userReport',agencies: agencies });
  });
});


router.get('/allAgencies',checkToken, function(req, res, next) {
  var userDetails = req.session.userRecord;
  collectionModel.find({}, function(err, agencies) {
    if (err) {
      return next(err);
    }
    res.render('allAgencies', { title: 'Rescue', page: 'allAgencies',user:userDetails, agencies: agencies });
  });
});

router.get('/suggestAgency',checkToken, function(req, res, next) {
  res.render('suggestAgency', { title: 'Rescue' , page : 'suggestAgency'});
});

router.get('/logout',checkToken,(req,res)=>{
  localStorage.removeItem('myToken');
  req.session.destroy();
  res.redirect('/');
});


// sign In
router.post('/signIn',urlencodedParser,(req,res)=>{
  var emailEntered = req.body.email;
  var passwordEntered = req.body.pass;
  var findRecord = collectionModel.find({email:req.body.email});
    
  findRecord.exec(function(err,data){
    if(err) throw err;
    if(data.length == 0 ){
      res.render('signIn',{message:"Email id not registered"})
    }
    else{
        if(bcrypt.compareSync(passwordEntered,data[0].password))
        {
          var token = jwt.sign({},'loginToken');
          localStorage.setItem('myToken',token);
          // localStorage.setItem('userRecord',JSON.stringify(data[0]));  // converting the object into string bcoz setItem function can onlu store string
          // var userDetails = JSON.parse(localStorage.getItem('userRecord'));  // retrieving the object from the string by using JSON.parse function
          req.session.userRecord=data[0];
          // res.send(req.session.Record);
          res.redirect('/dashboard')
        }
        else{
          res.render('signIn',{title:'invalid details',message:"Invalid Email Id and Password"})
        }
    }
  });
  });


router.post('/signUp', urlencodedParser,function(req, res, next) {

  var findRecord = collectionModel.find({email:req.body.email});
  findRecord.exec(function(err,data){
    if(err) throw err;
    if(data.length > 0 ){
      res.render('signIn',{message:"email id already registered"});
    }
    else{
  
    var record = new collectionModel({
      name:req.body.name,
      email:req.body.email,
      location : req.body.location,
      latitude : 1,
      longitude : 1, 
      available : 1,
      experience : 2,
      rating : 5,
      type : req.body.type,
      resources : {
        [req.body.resource1] : req.body.resourceNo1,
        [req.body.resource2] : req.body.resourceNo2,
        [req.body.resource3] : req.body.resourceNo3
      },
      password:bcrypt.hashSync(req.body.password,10),
    });

    record.save(function(err,ress){
      if(err) throw err;
      res.render('signUp',{message:"Registered Successfully. Login to Continue"});
    });
    }

  });
});


  router.post("/suggestAgency", urlencodedParser, checkToken, async (req, res) => {
      try {
          const userDetails = req.session.userRecord;
          const currLatitude = parseFloat(userDetails.latitude);
          const currLongitude = parseFloat(userDetails.longitude);
          const searchedResource = req.body.resource;
          const searchedQty = req.body.number;

          const loggedInAgency = await collectionModel.findOne({ email: userDetails.email });

          // Fetch all rescue agencies with the specified resource type
          const matchingAgencies = await collectionModel.find({
            'email' : {$ne : userDetails.email},
            'resources': { $exists: true, $ne: {} },
            [`resources.${searchedResource}`]: { $exists: true }
        });

          console.log("matching agencies : " );
          console.log(matchingAgencies);

          // Calculate and store scores for each agency
          const agenciesWithScores = matchingAgencies.map(agency => {
              const agencyLatitude = parseFloat(agency.latitude);
              const agencyLongitude = parseFloat(agency.longitude);

              const euclideanDistance = Math.sqrt(
                  Math.pow(currLatitude - agencyLatitude, 2) +
                  Math.pow(currLongitude - agencyLongitude, 2)
              );

              const score = 1 / euclideanDistance +
                  parseFloat(agency.available) +
                  parseFloat(agency.rating) +
                  parseFloat(agency.experience);

              return {
                  agency,
                  score
              };
          });

          // Sort agencies based on scores in descending order
          const sortedAgencies = agenciesWithScores.sort((a, b) => b.score - a.score);

          // Extract the sorted agencies without the scores for rendering
          const sortedAgenciesWithoutScores = sortedAgencies.map(item => item.agency);

          const resourceAvailable = loggedInAgency.resources[searchedResource];

          console.log(sortedAgencies)
          res.render('suggestAgency', {
              title: 'Rescue',
              page: 'suggestAgency',
              user: userDetails,
              searchedResource : searchedResource, 
              searchedQty : searchedQty,
              suggestedAgencies: sortedAgenciesWithoutScores,
              available : resourceAvailable,
              
              
          });
      } catch (error) {
          console.error(error);
          res.status(500).send("Internal Server Error");
      }
  });

router.post("/getNearbyAgencies", urlencodedParser,  async (req, res) => {
  try {

      const userLocation = req.body.location;
      const disasterType = req.body.disaster;  
      const latitude = parseFloat("23.70");
      const longitude = parseFloat("78.36");


      // Fetch all rescue agencies with the specified disaster type
      const matchingAgencies = await collectionModel.find({
        'type' : disasterType
    });

      console.log("matching agencies : " );
      console.log(matchingAgencies);

      // Calculate and store scores for each agency
      const agenciesWithScores = matchingAgencies.map(agency => {
          const agencyLatitude = parseFloat(agency.latitude);
          const agencyLongitude = parseFloat(agency.longitude);

          const euclideanDistance = Math.sqrt(
              Math.pow(latitude - agencyLatitude, 2) +
              Math.pow(longitude - agencyLongitude, 2)
          );

          const score = 1 / euclideanDistance +
              parseFloat(agency.available) +
              parseFloat(agency.rating) +
              parseFloat(agency.experience);

          return {
              agency,
              score
          };
      });

      // Sort agencies based on scores in descending order
      const sortedAgencies = agenciesWithScores.sort((a, b) => b.score - a.score);

      // Extract the sorted agencies without the scores for rendering
      const sortedAgenciesWithoutScores = sortedAgencies.map(item => item.agency);

      console.log(sortedAgencies)
      res.render('userReportNearbyAgency', {
          title: 'Rescue',
          page: 'userReportNearbyAgency',
          userLocation : userLocation,
          disaster:disasterType,
          suggestedAgencies: sortedAgenciesWithoutScores
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
  }
});



module.exports = router;
