const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://hotel-booking-platform-b1fc3.web.app",
    "https://hotel-booking-platform-b1fc3.firebaseapp.com",
  ],
  credentials: true,
  optionalSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n4ll4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("i am a middleware", token);
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
  });
  next();
  // console.log('verifyToken',token);
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    const roomsCollection = client.db("hotelDB").collection("rooms");
    const RoomBookedCollection = client.db("hotelDB").collection("booked");

    // JWT implement
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // console.log("jwt email...............", email?.email);
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Clear cookie from browser

    app.get("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // get all rooms
    app.get("/room-data", async (req, res) => {
      const sort = req.query.sort;
      let sortOptions = {};
      if (sort === "asc") {
        sortOptions = { price_per_night: 1 };
      } else if (sort === "dsc") {
        sortOptions = { price_per_night: -1 };
      }
      const result = await roomsCollection.find({}).sort(sortOptions).toArray();
      res.send(result);
    });

    // get all rooms
    app.get("/top-reateed", async (req, res) => {
      const result = await roomsCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      // console.log(result);
      res.send(result);
    });

    // rooms details
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    app.post("/my-booked-room", async (req, res) => {
      const MyRoom = req.body;
      const result = await RoomBookedCollection.insertOne(MyRoom);
      res.send(result);
    });
    //  getting data by email
    app.get("/my-booked-room", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.query.email;
      // console.log("decodedEmail", decodedEmail);
      // console.log('email from user',email);
      if (decodedEmail !== req.query.email)
        return res.status(401).send({ message: "unauthorized access" });

      const query = { bookingEmail: email };
      const result = await RoomBookedCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/my-booked-room/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await RoomBookedCollection.findOne(filter);
      res.send(result);
    });

    app.delete("/room-cancel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await RoomBookedCollection.deleteOne(query);
      res.send(result);
    });
    // update Room

    app.put("/update-room/:id", async (req, res) => {
      const id = req.params.id;
      const { date } = req.body;
      // console.log(date);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const room = {
        $set: {
          date: date,
        },
      };
      const result = await RoomBookedCollection.updateOne(
        filter,
        room,
        options
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hotel Booking server is Running");
});

app.listen(port, () => {
  console.log(`hotel booking server is running port:${port}`);
});
