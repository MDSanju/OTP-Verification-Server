const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;


// Middlewares
app.use(cors());
app.use(express.json());

const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5gvym.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
      const database = client.db("otp_verification");
      const messagesCollection = database.collection("messages");
      const emailOtpCollection = database.collection("emailOtp");


    // POST API
    app.post("/messages", async (req, res) => {
      const message = req.body;
      const result = await messagesCollection.insertOne(message);
      res.json(result);
    })

    // POST API
    app.post("/emailOtp", async (req, res) => {
      const otp = req.body;
      console.log(otp);
      const accessToken = await oAuth2Client.getAccessToken();
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: "OAuth2",
          user: process.env.USER,
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });
    
      // send mail with defined transport object
      let mailOptions = {
        from: '"OTP Verification" <mdsanjucad@gmail.com>', // sender address
        to: otp.email, // list of receivers
        subject: "Your New Generated OTP", // Subject line
        text: "OTP Code!", // plain text body
        html: `<b>${otp.submitEmailOTP}</b>`, // html body
      };
    
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }
          console.log("Message sent: %s", info.messageId);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    
      // Preview only available when sending through an Ethereal account
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
      })

      const numOTP = otp.submitEmailOTP;
      const strOTP = numOTP.toString();
      const mailAndOTP = {
        email: otp.email,
        submitEmailOTP: strOTP,
      }
      const result = await emailOtpCollection.insertOne(mailAndOTP);
      res.json(result);
    })

    // GET API
    app.get("/emailOTP/OTP", async (req, res) => {
        const cursor = emailOtpCollection.find({});
        const otp = await cursor.toArray();
        res.send(otp);
      })
      
    } finally {
    //   await client.close();
    }
  }

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('OTP Contact Form Server Is Running!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})