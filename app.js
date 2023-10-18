const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

// Initialize Firebase Admin SDK
const serviceAccount = require('./keys.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-h55ca%40group-f33d1.iam.gserviceaccount.com', // Replace with your Firestore database URL
    ignoreUndefinedProperties: true, 
});

const firestore = admin.firestore();

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

let tokenCounter = 0;
let tokenCounters = {};


app.set('view engine', 'ejs');

async function getUserData(email) {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
}

async function comparePassword(inputPassword, hashedPassword) {
    return bcrypt.compare(inputPassword, hashedPassword);
}

// Define the checkEmailExists function to check if email exists in Firestore
async function checkEmailExists(email) {
    const userRef = firestore.collection('users').doc(email);
    const userDoc = await userRef.get();
    return userDoc.exists;
}

// Serve static files from the 'public' directory
app.use(express.static(__dirname + '/public'));

// Define routes
app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { name, dob, email, password, terms } = req.body;

    // Check if email already exists in Firestore
    const userRef = firestore.collection('users').doc(email);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
        return res.send('Email already registered.');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save user data to Firestore
    await userRef.set({
        name,
        dob,
        email,
        password: hashedPassword,
        terms,
    });

    res.redirect('/dashboard');
});

app.get('/signin', (req, res) => {
    res.render('signin');
});

app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    // Check if email exists
    const userExists = await checkEmailExists(email);
    if (!userExists) {
        return res.send('Email not found.');
    }

    // Retrieve user data from Firestore
    const userData = await getUserData(email);

    // Compare hashed password with user input
    const passwordMatch = await comparePassword(password, userData.password);
    if (!passwordMatch) {
        return res.send('Incorrect password.');
    }

    // User is authenticated, you can implement a session or JWT for further authorization.

    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    // Retrieve user data from Firestore (name, dob, email)
    // Replace the following line with the code to retrieve the user's data.
    const userData = {
        name: 'John Doe',
        dob: '01/01/1990',
        email: 'john@example.com',
    };

    res.render('dashboard', { userData });
});


app.get('/hospital', (req, res) => {
    res.render('hospital'); // Render the "hospital.ejs" template
});


app.post('/submitForm', async (req, res) => {
  const data = {
    name: req.body.name,
    dob: req.body.dob,
    age: req.body.age,
    village: req.body.village,
    phone: req.body.phone,
    appointmentDate: req.body.appointmentDate,
    token: 0, // Placeholder for the token value
    timestamp: new Date().toString() // Record the submission time
  };


  try {
    const appointmentDate = req.body.appointmentDate;

    // Check if the token counter exists for the appointment date
    if (!tokenCounters[appointmentDate]) {
      tokenCounters[appointmentDate] = 0;
    }

    // Increment the counter based on the appointment date
    tokenCounters[appointmentDate] += 1;
    const token = tokenCounters[appointmentDate]; // Generating token based on the appointment date counter

    const docId = `${token}_${appointmentDate}`; // Combine token and appointment date for document ID

    await firestore.collection('appointment').doc(docId).set(data); // Set the document with the combined ID


    res.send(`Form submitted successfully! Your token number is ${token}`);
  } catch (error) {
    console.error('Error adding document: ', error);
    res.send('An error occurred while submitting the form.');
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
