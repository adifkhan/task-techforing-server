const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qblhfjt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const userCollection = client.db('techforing').collection('users');
    const jobCollection = client.db('techforing').collection('jobs');

    // POST user and get a token //
    app.post('/user', async (req, res) => {
      const user = req.body;
      const email = user.email;
      const filter = { email: email };
      const cursor = await userCollection.findOne(filter);
      if (cursor) {
        const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1d',
        });
        return res.send({ token });
      }
      const result = await userCollection.insertOne(user);
      const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d',
      });
      res.send({ result, token });
    });

    // POST new Job post //
    app.post('/jobpost', async (req, res) => {
      const jobInfo = req.body;
      const result = await jobCollection.insertOne(jobInfo);
      res.send(result);
    });

    // GET Job Post //
    app.get('/jobpost', verifyJWT, async (req, res) => {
      const category = req.query.category;
      const query = { category: category };
      const cursor = jobCollection.find(query);
      const jobposts = await cursor.toArray();
      res.send(jobposts);
    });

    //GET single Post details by post id //
    app.get('/post-details', async (req, res) => {
      const postId = req.query.postId;
      const filter = { _id: new ObjectId(postId) };
      const cursor = await jobCollection.findOne(filter);
      res.send(cursor);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('TechForing');
});

app.listen(port, () => {
  console.log('Listening to port', port);
});
