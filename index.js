const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sirqfba.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const perfumeCollection = client.db("mysticDB").collection("perfumes");
    const reviewCollection = client.db("mysticDB").collection("reviews");
    const cartCollection = client.db("mysticDB").collection("carts");
    const userCollection = client.db("mysticDB").collection("users");

    //jwt related api
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'} );
      res.send({token});
    })
    //middlewares
    const verifyToken = (req,res,next)=>{
      console.log( 'inside verify token', req.headers);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbidden access' })
      }
      // next();
    }

    app.get("/perfumes", async (req, res) => {
      const result = await perfumeCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    //CARTS-----COLLECTION-----
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // app.post("/carts", async (req, res) => {
    //   const cartItem = req.body;
    //   const result = await cartCollection.insertOne(cartItem);
    //   res.send(result);
    // });
    app.post("/carts", async (req, res) => {
      try {
        const cartItem = req.body;
        // If you want to force using the original _id
        const result = await cartCollection.insertOne({
          ...cartItem,
          _id: new ObjectId(cartItem._id), // Convert to ObjectId
        });
        res.send(result);
      } catch (error) {
        if (error.code === 11000) {
          // Handle duplicate key error
          res.status(400).send({ error: "Item already in cart" });
        } else {
          res.status(500).send({ error: "Server error" });
        }
      }
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // USERS------RELATED ----API
    app.get("/users", async (req, res) => {
      console.log(req.headers)
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      // First check if the user is already an admin
      const user = await userCollection.findOne(filter);
      if (user.role === "admin") {
        return res.send({ acknowledged: true, modifiedCount: 0 });
      }
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("mystic aura is running");
});
app.listen(port, () => {
  console.log(`Mystic Aura is running on port ${port}`);
});
